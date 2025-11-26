import { createClient } from '@supabase/supabase-js';
import { SodreSantoroRealScraper } from './scrapers/sodre-santoro-real';
import { SodreSantoroFastScraper } from './scrapers/sodre-santoro-fast';
import { SodreSantoroBatchScraper } from './scrapers/sodre-santoro-batch';
import { SuperbidRealScraper } from './scrapers/superbid-real';
import { VehicleData } from './base-scraper';
import { normalizeVehicleBrandModel } from '../vehicle-normalization';
// Removido: normalizeVehicleTypeForDB, validateVehicleTypeByModel - não normalizamos mais tipo de veículo
import { getVehicleTableInfo, hasVehicleColumn } from './vehicle-table-info';
import path from 'path';
import { fileURLToPath } from 'url';

// Inicializar Supabase
// Suporte para Vercel (NEXT_PUBLIC_*) e GitHub Actions (SUPABASE_*)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable is required');
}

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface ScrapingResult {
  auctioneer: string;
  success: boolean;
  vehiclesScraped: number;
  vehiclesCreated: number;
  vehiclesUpdated: number;
  errors: string[];
  executionTimeMs: number;
}

/**
 * Executa o scraping de todos os leiloeiros
 */
export async function runAllScrapers(): Promise<ScrapingResult[]> {
  console.log('====================================');
  console.log('Iniciando scraping de todos os leiloeiros');
  console.log('====================================');

  const results: ScrapingResult[] = [];

  // Lista de scrapers disponíveis
  const allScrapers = [
    new SodreSantoroRealScraper(),
    new SuperbidRealScraper(),
  ];

  // Filtrar por AUCTIONEERS se fornecido (slug(s) separados por vírgula)
  let scrapers = allScrapers as any[];
  const envList = (process.env.AUCTIONEERS || '').trim();
  if (envList.length > 0) {
    const wanted = envList
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    scrapers = allScrapers.filter((scraper: any) => {
      const name = String(scraper.auctioneerName || scraper.name || '');
      const slugFromName = normalize(name);
      // aliases conhecidos
      const aliases: string[] = [slugFromName];
      if (/sodr[eé]/i.test(name)) aliases.push('sodre-santoro', 'sodre-santoro-real');
      if (/superbid/i.test(name)) aliases.push('superbid');
      return aliases.some((alias) => wanted.includes(alias));
    });
    console.log('Filtrando scrapers pelos AUCTIONEERS:', wanted, '=> selecionados:', scrapers.map((s: any) => s.auctioneerName));
  }

  for (const scraper of scrapers) {
    const result = await runScraper(scraper);
    results.push(result);
    
    // Delay entre leiloeiros
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  console.log('====================================');
  console.log('Scraping concluído');
  console.log('Resumo:');
  results.forEach((r) => {
    console.log(
      `  ${r.auctioneer}: ${r.success ? '✓' : '✗'} - ${r.vehiclesCreated} novos, ${r.vehiclesUpdated} atualizados`
    );
  });
  console.log('====================================');

  return results;
}

/**
 * Executa o scraping de um leiloeiro específico
 */
async function runScraper(scraper: any): Promise<ScrapingResult> {
  const startTime = Date.now();
  const auctioneerName = scraper.auctioneerName;

  const result: ScrapingResult = {
    auctioneer: auctioneerName,
    success: false,
    vehiclesScraped: 0,
    vehiclesCreated: 0,
    vehiclesUpdated: 0,
    errors: [],
    executionTimeMs: 0,
  };

  try {
    console.log(`[${auctioneerName}] Iniciando scraping...`);
    
    // 1. Buscar ID do leiloeiro no banco
    console.log(`[${auctioneerName}] Buscando leiloeiro no banco...`);
    // Resolver leiloeiro de forma resiliente (por nome e por possíveis slugs conhecidos)
    const { data: auctioneerByName, error: auctioneerError } = await supabase
      .from('auctioneers')
      .select('id, slug, name')
      .eq('name', auctioneerName)
      .maybeSingle();

    let auctioneer = auctioneerByName as any;

    if (!auctioneer) {
      // Candidatos de slug em ordem de preferência
      const candidateSlugs: string[] = [];
      const normalizedFromName = auctioneerName
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      candidateSlugs.push(normalizedFromName);

      // Slugs conhecidos quando o nome contém "Sodré"
      if (/sodr[eé]/i.test(auctioneerName)) {
        candidateSlugs.push('sodre-santoro');
        candidateSlugs.push('sodre-santoro-real');
      }

      // Tentar por slug
      for (const slug of candidateSlugs) {
        const { data: bySlug } = await supabase
          .from('auctioneers')
          .select('id, slug, name')
          .eq('slug', slug)
          .maybeSingle();
        if (bySlug) {
          auctioneer = bySlug as any;
          break;
        }
      }

      // Se ainda não existir, criar automaticamente
      if (!auctioneer) {
        const { data: created, error: createErr } = await supabase
          .from('auctioneers')
          .insert({
            name: auctioneerName,
            slug: normalizedFromName,
            website_url: null,
            last_scrape_at: null,
            is_active: true,
          })
          .select('id, slug, name')
          .single();

        if (createErr) {
          throw new Error(`Falha ao criar leiloeiro automaticamente: ${createErr.message}`);
        }
        auctioneer = created as any;
      }
    }

    if (auctioneerError) {
      console.error(`[${auctioneerName}] Erro ao buscar leiloeiro:`, auctioneerError);
    }

    if (!auctioneer) {
      throw new Error(`Leiloeiro "${auctioneerName}" não encontrado no banco (tentei por nome e slugs relacionados)`);
    }

    const auctioneerId = auctioneer.id;
    console.log(`[${auctioneerName}] Leiloeiro encontrado com ID: ${auctioneerId}`);

    // 2. Executar scraping
    console.log(`[${auctioneerName}] Executando scraper...`);
    // Executa o fluxo completo do scraper (inicializa navegador, coleta e fecha)
    const vehicles = await scraper.run();
    console.log(`[${auctioneerName}] Scraping concluído. ${vehicles.length} veículos encontrados.`);
    result.vehiclesScraped = vehicles.length;

    // 3. Processar cada veículo
    console.log(`[${auctioneerName}] 🚀 Iniciando processamento de ${vehicles.length} veículos...`);
    let processedCount = 0;
    let errorCount = 0;
    
    for (const vehicleData of vehicles) {
      processedCount++;
      try {
        if (processedCount % 50 === 0) {
          console.log(`[${auctioneerName}] 📊 Progresso: ${processedCount}/${vehicles.length} veículos processados...`);
        }
        
        const { created, updated } = await processVehicle(vehicleData, auctioneerId, auctioneerName);
        
        if (created) {
          result.vehiclesCreated++;
          if (result.vehiclesCreated % 10 === 0) {
            console.log(`[${auctioneerName}] ✅ ${result.vehiclesCreated} veículos criados até agora...`);
          }
        }
        if (updated) {
          result.vehiclesUpdated++;
          if (result.vehiclesUpdated % 10 === 0) {
            console.log(`[${auctioneerName}] 🔄 ${result.vehiclesUpdated} veículos atualizados até agora...`);
          }
        }
        
        // Log se nem criou nem atualizou (possível problema)
        if (!created && !updated) {
          console.warn(`[${auctioneerName}] ⚠️ Veículo ${vehicleData.external_id || 'sem ID'} não foi criado nem atualizado.`);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`[${auctioneerName}] ❌ Erro ao processar veículo ${vehicleData.external_id || 'sem ID'}:`, error);
        console.error(`[${auctioneerName}] Stack trace:`, error.stack);
        console.error(`[${auctioneerName}] Dados do veículo:`, {
          title: vehicleData.title,
          brand: vehicleData.brand,
          model: vehicleData.model,
          external_id: vehicleData.external_id
        });
        result.errors.push(`${vehicleData.external_id || 'sem ID'}: ${error.message}`);
        
        // Log primeiros 5 erros completos para debug
        if (errorCount <= 5) {
          console.error(`[${auctioneerName}] 🔍 Erro detalhado #${errorCount}:`, JSON.stringify(error, null, 2));
        }
      }
    }
    
    console.log(`[${auctioneerName}] 📊 Processamento concluído: ${processedCount} processados, ${result.vehiclesCreated} criados, ${result.vehiclesUpdated} atualizados, ${errorCount} erros`);

    // 4. Atualizar última execução do leiloeiro
    await supabase
      .from('auctioneers')
      .update({ last_scrape_at: new Date().toISOString() })
      .eq('id', auctioneerId);

    result.success = true;
  } catch (error: any) {
    console.error(`[${auctioneerName}] Erro no scraping:`, error);
    console.error(`[${auctioneerName}] Stack trace:`, error.stack);
    result.errors.push(error.message);
  }

  result.executionTimeMs = Date.now() - startTime;

  // 5. Salvar log no banco
  await saveScrapingLog(result);

  return result;
}

/**
 * Processa um veículo: busca FIPE, calcula score, salva no banco
 */
async function processVehicle(
  vehicleData: VehicleData,
  auctioneerId: string,
  auctioneerName: string
): Promise<{ created: boolean; updated: boolean }> {
  // 1. Extrair URL base do leiloeiro para leiloeiro_url
  const leiloeiroUrl = vehicleData.original_url 
    ? new URL(vehicleData.original_url).origin 
    : '';

  // 5. Normalizar tipo de leilão para valores aceitos pelo schema
  const normalizeAuctionType = (type?: string): 'online' | 'presencial' | 'hibrido' => {
    if (!type) return 'online';
    const typeLower = type.toLowerCase();
    if (typeLower.includes('presencial')) return 'presencial';
    if (typeLower.includes('hibrido') || typeLower.includes('híbrido')) return 'hibrido';
    return 'online';
  };

  // 6. Usar tipo de veículo diretamente do scraper (SEM normalização ou classificação)
  // Tipos aceitos: "Caminhões e Ônibus", "Carros", "Motos"
  let vehicleType: string = vehicleData.vehicle_type || 'Carros';
  
  // Garantir que sempre tenha um tipo válido
  if (!vehicleType) {
    vehicleType = 'Carros';
    console.warn(`[${auctioneerName}] Tipo não definido, usando padrão 'Carros'`);
  }
  
  console.log(`[${auctioneerName}] Tipo de veículo (sem normalização): ${vehicleType}`);

  // 7. Normalizar marca e modelo (mas não o tipo)
  let normalizedBrand = vehicleData.brand || null;
  let normalizedModel = vehicleData.model || null;
  let normalizedVariant: string | null = null;
  
  // Determinar tipo FIPE para normalização de marca/modelo
  let vehicleTypeForFipe: 'carros' | 'motos' | 'caminhoes' = 'carros';
  if (vehicleType.toLowerCase().includes('moto')) {
    vehicleTypeForFipe = 'motos';
  } else if (vehicleType.toLowerCase().includes('caminh') || vehicleType.toLowerCase().includes('ônibus')) {
    vehicleTypeForFipe = 'caminhoes';
  }
  
  try {
    const normalizationResult = await normalizeVehicleBrandModel(
      normalizedBrand || vehicleData.brand,
      normalizedModel || vehicleData.model,
      vehicleTypeForFipe
    );
    
    normalizedBrand = normalizationResult.brand || normalizedBrand;
    normalizedModel = normalizationResult.model || normalizedModel;
    normalizedVariant = normalizationResult.variant ?? null;
    
    if (normalizationResult.wasSeparated || normalizationResult.wasNormalized) {
      console.log(`[${auctioneerName}] Marca/Modelo normalizado:`, {
        original: { brand: vehicleData.brand, model: vehicleData.model },
        normalized: { brand: normalizedBrand, model: normalizedModel }
      });
    }
  } catch (error) {
    console.warn(`[${auctioneerName}] Erro ao normalizar marca/modelo, usando valores originais:`, error);
    normalizedBrand = vehicleData.brand || null;
    normalizedModel = vehicleData.model || null;
  }

  // 9. Preparar dados para salvar com suporte a múltiplos esquemas
  const vehicleTableInfo = await getVehicleTableInfo(supabase);
  const vehicleToSave: Record<string, any> = {};

  const assign = (column: string, value: any, force: boolean = false) => {
    // force=true garante que o campo sempre seja adicionado, mesmo se a coluna não for detectada
    if (!force && !hasVehicleColumn(vehicleTableInfo, column)) {
      return;
    }
    if (value === undefined) {
      return;
    }
    vehicleToSave[column] = value;
  };

  // Tipo já está no formato final (sem normalização)
  const englishVehicleType = vehicleType;
  
  // Log do tipo que será salvo
  console.log(`[${auctioneerName}] Tipo final a ser salvo (sem normalização):`, {
    vehicleType: vehicleType,
    brand: normalizedBrand,
    model: normalizedModel
  });
  const normalizedAuctionType = normalizeAuctionType(vehicleData.auction_type);
  const englishAuctionType = normalizedAuctionType
    ? `${normalizedAuctionType.charAt(0).toUpperCase()}${normalizedAuctionType.slice(1)}`
    : null;

  const mileageValue = vehicleData.mileage ?? null;
  const minimumBid = vehicleData.minimum_bid ?? vehicleData.current_bid ?? 0;
  const currentBid = vehicleData.current_bid ?? 0;
  const englishCurrentBid = vehicleData.current_bid ?? null;
  const englishMinimumBid = vehicleData.minimum_bid ?? vehicleData.current_bid ?? null;
  const fallbackState = vehicleData.state || 'SP';
  const fallbackCity = vehicleData.city || 'São Paulo';
  const thumbnailUrl = vehicleData.thumbnail_url || vehicleData.images?.[0] || null;
  const imagesArray = vehicleData.images && vehicleData.images.length > 0 ? vehicleData.images : null;

  // Campos obrigatórios (NOT NULL no schema real)
  // Campos obrigatórios (NOT NULL)
  assign('title', vehicleData.title, true);
  assign('brand', normalizedBrand || 'Desconhecida', true);
  assign('model', normalizedModel || 'Desconhecido', true);
  assign('state', fallbackState, true);
  assign('city', fallbackCity, true);
  assign('original_url', vehicleData.original_url || leiloeiroUrl || '', true);
  assign('auctioneer_id', auctioneerId, true);
  
  // Campos opcionais (nullable)
  assign('description', vehicleData.title || null);
  assign('version', normalizedVariant || null);
  assign('year_model', vehicleData.year_model || null);
  assign('year_manufacture', vehicleData.year_manufacture || vehicleData.year_model || null);
  assign('vehicle_type', englishVehicleType, true); // Sempre salvar tipo (já normalizado)
  assign('color', vehicleData.color || null);
  assign('fuel_type', vehicleData.fuel_type || null);
  assign('transmission', vehicleData.transmission || null);
  assign('mileage', mileageValue || null);
  assign('license_plate', vehicleData.license_plate || null);
  assign('current_bid', englishCurrentBid);
  assign('minimum_bid', englishMinimumBid);
  assign('appraised_value', vehicleData.appraised_value || null);
  assign('auction_type', englishAuctionType);
  assign('auction_status', (vehicleData as any).auction_status || null);
  assign('auction_date', vehicleData.auction_date ? vehicleData.auction_date.toISOString() : null);
  assign('has_financing', vehicleData.has_financing ?? null);
  assign('accepts_financing', vehicleData.has_financing ?? null);
  // aceita_financiamento existe no banco (legado), mas usar accepts_financing ou has_financing
  assign('aceita_financiamento', vehicleData.has_financing ?? null);
  assign('thumbnail_url', thumbnailUrl);
  assign('images', imagesArray); // Se a coluna images existir
  assign('external_id', vehicleData.external_id || null);
  assign('lot_number', vehicleData.lot_number || null);
  assign('is_active', (vehicleData as any).is_active ?? true);
  assign('condition', vehicleData.condition || null);
  assign('leiloeiro', auctioneerName); // Legado, mas existe no banco (nullable)

  // 10. Verificar se veículo já existe (usando leiloeiro + external_id ou apenas external_id)
  let existingVehicleId: string | null = null;
  let isUpdate = false;
  
  if (vehicleData.external_id) {
    const lookupStrategies = [];

    if (hasVehicleColumn(vehicleTableInfo, 'auctioneer_id')) {
      lookupStrategies.push(
        supabase
          .from('vehicles')
          .select('id')
          .eq('auctioneer_id', auctioneerId)
          .eq('external_id', vehicleData.external_id)
          .maybeSingle()
      );
    }

    if (hasVehicleColumn(vehicleTableInfo, 'leiloeiro')) {
      lookupStrategies.push(
        supabase
          .from('vehicles')
          .select('id')
          .eq('leiloeiro', auctioneerName)
          .eq('external_id', vehicleData.external_id)
          .maybeSingle()
      );
    }

    // Fallback: buscar somente por external_id
    lookupStrategies.push(
      supabase
        .from('vehicles')
        .select('id')
        .eq('external_id', vehicleData.external_id)
        .maybeSingle()
    );

    for (const strategy of lookupStrategies) {
      try {
        const { data, error } = await strategy;
        if (error) {
          console.warn(`[${auctioneerName}] Erro ao verificar veículo existente:`, error.message ?? error);
          continue;
        }
        if (data) {
          existingVehicleId = data.id;
          isUpdate = true;
          break;
        }
      } catch (err: any) {
        console.warn(`[${auctioneerName}] Exceção ao verificar veículo existente:`, err.message ?? err);
      }
    }
  }

  // 11. Inserir ou atualizar no banco
  let vehicleId: string;
  
  if (isUpdate && existingVehicleId) {
    // Atualizar veículo existente
    let data, error;
    let vehicleToSaveMinimal: Record<string, any> | null = null;
    
    const updateResult = await supabase
      .from('vehicles')
      .update(vehicleToSave)
      .eq('id', existingVehicleId)
      .select('id')
      .single();
    
    data = updateResult.data;
    error = updateResult.error;
    
    // Se falhar por causa de campos que não existem, remover campos opcionais e tentar novamente
    if (error && (error.message.includes('does not exist') || error.message.includes('column'))) {
      console.warn(`[${auctioneerName}] Tentando atualizar sem campos opcionais:`, error.message);
      
      // Remover campos opcionais que podem não existir
      vehicleToSaveMinimal = { ...vehicleToSave };
      
      // Remover campos opcionais específicos que podem não existir
      delete vehicleToSaveMinimal.description;
      delete vehicleToSaveMinimal.version;
      delete vehicleToSaveMinimal.year_manufacture;
      delete vehicleToSaveMinimal.appraised_value;
      delete vehicleToSaveMinimal.auction_status;
      delete vehicleToSaveMinimal.has_financing;
      delete vehicleToSaveMinimal.fipe_discount_percentage;
      delete vehicleToSaveMinimal.images;
      delete vehicleToSaveMinimal.thumbnail_url;
      delete vehicleToSaveMinimal.condition;
      delete vehicleToSaveMinimal.is_active;
      delete vehicleToSaveMinimal.views_count;
      delete vehicleToSaveMinimal.favorites_count;
      delete vehicleToSaveMinimal.scraped_at;
      
      // Remover tipo_veiculo se existir (não é a coluna correta, é vehicle_type)
      if (vehicleToSaveMinimal.tipo_veiculo) {
        delete vehicleToSaveMinimal.tipo_veiculo;
      }
      
      // Garantir que campos obrigatórios estejam presentes
      if (!vehicleToSaveMinimal.title) vehicleToSaveMinimal.title = vehicleData.title || '';
      if (!vehicleToSaveMinimal.brand) vehicleToSaveMinimal.brand = normalizedBrand || 'Desconhecida';
      if (!vehicleToSaveMinimal.model) vehicleToSaveMinimal.model = normalizedModel || 'Desconhecido';
      if (!vehicleToSaveMinimal.state) vehicleToSaveMinimal.state = fallbackState;
      if (!vehicleToSaveMinimal.city) vehicleToSaveMinimal.city = fallbackCity;
      if (!vehicleToSaveMinimal.original_url) vehicleToSaveMinimal.original_url = vehicleData.original_url || leiloeiroUrl || '';
      if (!vehicleToSaveMinimal.auctioneer_id) vehicleToSaveMinimal.auctioneer_id = auctioneerId;
      if (!vehicleToSaveMinimal.vehicle_type) {
        vehicleToSaveMinimal.vehicle_type = englishVehicleType || 'Carros';
      }
      
      const retryResult = await supabase
        .from('vehicles')
        .update(vehicleToSaveMinimal)
        .eq('id', existingVehicleId)
        .select('id')
        .single();
      
      data = retryResult.data;
      error = retryResult.error;
    }
    
    if (error) {
      console.error(`[${auctioneerName}] ❌ Erro detalhado ao atualizar veículo:`, {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        vehicle_id: existingVehicleId,
        vehicle_title: vehicleData.title,
        vehicle_external_id: vehicleData.external_id,
        campos_tentados: Object.keys(vehicleToSaveMinimal || vehicleToSave)
      });
      throw new Error(`Erro ao atualizar veículo: ${error.message} (Code: ${error.code || 'N/A'})`);
    }
    
    if (!data) {
      console.error(`[${auctioneerName}] ❌ Nenhum dado retornado após atualização:`, {
        vehicle_id: existingVehicleId,
        vehicle_title: vehicleData.title,
        vehicle_external_id: vehicleData.external_id,
        error_anterior: error
      });
      throw new Error('Erro ao atualizar veículo: nenhum dado retornado');
    }
    
    vehicleId = data.id;
    
    // Verificar se tipo foi realmente salvo corretamente
    try {
      const { data: savedVehicle, error: fetchError } = await supabase
        .from('vehicles')
        .select('vehicle_type')
        .eq('id', vehicleId)
        .single();
      
      if (!fetchError && savedVehicle) {
        const tipoSalvo = savedVehicle.vehicle_type;
        const tipoEsperado = englishVehicleType;
        
        if (tipoSalvo !== tipoEsperado) {
          console.warn(`[${auctioneerName}] ⚠️  Tipo salvo diferente do esperado:`, {
            esperado: tipoEsperado,
            salvo: tipoSalvo,
            vehicle_id: vehicleId
          });
          // Tentar corrigir imediatamente
          await supabase
            .from('vehicles')
            .update({ vehicle_type: tipoEsperado })
            .eq('id', vehicleId);
          console.log(`[${auctioneerName}] ✅ Tipo corrigido após salvamento`);
        }
        
        console.log(`[${auctioneerName}] Veículo atualizado:`, {
          id: vehicleId,
          tipo_esperado: tipoEsperado,
          tipo_salvo: tipoSalvo,
          marca: normalizedBrand,
          modelo: normalizedModel,
        });
      } else {
        console.log(`[${auctioneerName}] Veículo atualizado:`, {
          id: vehicleId,
          tipo_esperado: englishVehicleType,
          marca: normalizedBrand,
          modelo: normalizedModel,
        });
      }
    } catch (error) {
      console.warn(`[${auctioneerName}] Erro ao verificar tipo salvo:`, error);
      console.log(`[${auctioneerName}] Veículo atualizado:`, {
        id: vehicleId,
        tipo_esperado: englishVehicleType,
        marca: normalizedBrand,
        modelo: normalizedModel
      });
    }
  } else {
    // Inserir novo veículo
    let data, error;
    let vehicleToSaveMinimal: Record<string, any> | null = null;
    
    // Tentar inserir com todos os campos
    const insertResult = await supabase
      .from('vehicles')
      .insert(vehicleToSave)
      .select('id')
      .single();
    
    data = insertResult.data;
    error = insertResult.error;
    
    // Se falhar por causa de campos que não existem, remover campos opcionais e tentar novamente
    if (error && (error.message.includes('does not exist') || error.message.includes('column'))) {
      console.warn(`[${auctioneerName}] Tentando inserir sem campos opcionais:`, error.message);
      
      // Remover campos opcionais que podem não existir
      vehicleToSaveMinimal = { ...vehicleToSave };
      
      // Remover campos opcionais específicos que podem não existir
      delete vehicleToSaveMinimal.description;
      delete vehicleToSaveMinimal.version;
      delete vehicleToSaveMinimal.year_manufacture;
      delete vehicleToSaveMinimal.appraised_value;
      delete vehicleToSaveMinimal.auction_status;
      delete vehicleToSaveMinimal.has_financing;
      delete vehicleToSaveMinimal.fipe_discount_percentage;
      delete vehicleToSaveMinimal.images;
      delete vehicleToSaveMinimal.thumbnail_url;
      delete vehicleToSaveMinimal.condition;
      delete vehicleToSaveMinimal.is_active;
      delete vehicleToSaveMinimal.views_count;
      delete vehicleToSaveMinimal.favorites_count;
      delete vehicleToSaveMinimal.scraped_at;
      
      // Remover tipo_veiculo se existir (não é a coluna correta, é vehicle_type)
      if (vehicleToSaveMinimal.tipo_veiculo) {
        delete vehicleToSaveMinimal.tipo_veiculo;
      }
      
      // Garantir que campos obrigatórios estejam presentes
      if (!vehicleToSaveMinimal.title) vehicleToSaveMinimal.title = vehicleData.title || '';
      if (!vehicleToSaveMinimal.brand) vehicleToSaveMinimal.brand = normalizedBrand || 'Desconhecida';
      if (!vehicleToSaveMinimal.model) vehicleToSaveMinimal.model = normalizedModel || 'Desconhecido';
      if (!vehicleToSaveMinimal.state) vehicleToSaveMinimal.state = fallbackState;
      if (!vehicleToSaveMinimal.city) vehicleToSaveMinimal.city = fallbackCity;
      if (!vehicleToSaveMinimal.original_url) vehicleToSaveMinimal.original_url = vehicleData.original_url || leiloeiroUrl || '';
      if (!vehicleToSaveMinimal.auctioneer_id) vehicleToSaveMinimal.auctioneer_id = auctioneerId;
      if (!vehicleToSaveMinimal.vehicle_type) {
        vehicleToSaveMinimal.vehicle_type = englishVehicleType || 'Carros';
      }
      
      const retryResult = await supabase
        .from('vehicles')
        .insert(vehicleToSaveMinimal)
        .select('id')
        .single();
      
      data = retryResult.data;
      error = retryResult.error;
    }
    
    if (error) {
      console.error(`[${auctioneerName}] ❌ Erro detalhado ao inserir veículo:`, {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        vehicle_title: vehicleData.title,
        vehicle_external_id: vehicleData.external_id,
        campos_tentados: Object.keys(vehicleToSaveMinimal || vehicleToSave)
      });
      throw new Error(`Erro ao salvar veículo: ${error.message} (Code: ${error.code || 'N/A'})`);
    }
    
    if (!data) {
      console.error(`[${auctioneerName}] ❌ Nenhum dado retornado após inserção:`, {
        vehicle_title: vehicleData.title,
        vehicle_external_id: vehicleData.external_id,
        error_anterior: error
      });
      throw new Error('Erro ao salvar veículo: nenhum dado retornado');
    }
    
    vehicleId = data.id;
    
    // Verificar se tipo foi realmente salvo corretamente
    try {
      const { data: savedVehicle, error: fetchError } = await supabase
        .from('vehicles')
        .select('vehicle_type')
        .eq('id', vehicleId)
        .single();
      
      if (!fetchError && savedVehicle) {
        const tipoSalvo = savedVehicle.vehicle_type;
        const tipoEsperado = englishVehicleType;
        
        if (tipoSalvo !== tipoEsperado) {
          console.warn(`[${auctioneerName}] ⚠️  Tipo salvo diferente do esperado:`, {
            esperado: tipoEsperado,
            salvo: tipoSalvo,
            vehicle_id: vehicleId
          });
          // Tentar corrigir imediatamente
          await supabase
            .from('vehicles')
            .update({ vehicle_type: tipoEsperado })
            .eq('id', vehicleId);
          console.log(`[${auctioneerName}] ✅ Tipo corrigido após salvamento`);
        }
        
        console.log(`[${auctioneerName}] Veículo inserido:`, {
          id: vehicleId,
          tipo_esperado: tipoEsperado,
          tipo_salvo: tipoSalvo,
          marca: normalizedBrand,
          modelo: normalizedModel,
        });
      } else {
        console.log(`[${auctioneerName}] Veículo inserido:`, {
          id: vehicleId,
          tipo_esperado: englishVehicleType,
          marca: normalizedBrand,
          modelo: normalizedModel,
        });
      }
    } catch (error) {
      console.warn(`[${auctioneerName}] Erro ao verificar tipo salvo:`, error);
      console.log(`[${auctioneerName}] Veículo inserido:`, {
        id: vehicleId,
        tipo_esperado: englishVehicleType,
        marca: normalizedBrand,
        modelo: normalizedModel
      });
    }
  }

  // 12. Salvar imagens em tabela separada (se existir a tabela vehicle_images)
  try {
    if (vehicleData.images && vehicleData.images.length > 0) {
      await saveVehicleImages(vehicleId, vehicleData.images);
    }
  } catch (imgError: any) {
    // Se a tabela vehicle_images não existir, apenas logar o erro mas não falhar
    console.warn(`[${auctioneerName}] Não foi possível salvar imagens separadamente:`, imgError.message);
  }

  // Retornar se foi criação ou atualização
  return { created: !isUpdate, updated: isUpdate };
}

/**
 * Salva as imagens de um veículo
 */
async function saveVehicleImages(
  vehicleId: string,
  images: string[]
): Promise<void> {
  // Deletar imagens antigas
  await supabase.from('vehicle_images').delete().eq('vehicle_id', vehicleId);

  // Inserir novas imagens
  const imagesToInsert = images.map((url, index) => ({
    vehicle_id: vehicleId,
    url,
    is_primary: index === 0,
    display_order: index,
  }));

  await supabase.from('vehicle_images').insert(imagesToInsert);
}

/**
 * Salva o log de execução do scraping
 */
async function saveScrapingLog(result: ScrapingResult): Promise<void> {
  // Buscar ID do leiloeiro
  const { data: auctioneer } = await supabase
    .from('auctioneers')
    .select('id')
    .eq('name', result.auctioneer)
    .single();

  if (!auctioneer) return;

  await supabase.from('scraping_logs').insert({
    auctioneer_id: auctioneer.id,
    status: result.success ? 'success' : 'error',
    vehicles_scraped: result.vehiclesScraped,
    vehicles_created: result.vehiclesCreated,
    vehicles_updated: result.vehiclesUpdated,
    error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
    execution_time_ms: result.executionTimeMs,
    started_at: new Date(Date.now() - result.executionTimeMs).toISOString(),
    completed_at: new Date().toISOString(),
    metadata: {
      errors: result.errors,
    },
  });
}

// Executa automaticamente quando chamado via CLI: `node --import tsx src/lib/scraping/index.ts`
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
const current = path.resolve(__filename);
const isDirectRun = entry && current === entry;

if (isDirectRun) {
  runAllScrapers()
    .then(() => {
      console.log('Scraping finalizado.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Erro ao executar scraping:', err);
      process.exit(1);
    });
}

