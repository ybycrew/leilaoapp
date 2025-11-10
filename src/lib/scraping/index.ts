import { createClient } from '@supabase/supabase-js';
import { SodreSantoroRealScraper } from './scrapers/sodre-santoro-real';
import { SodreSantoroFastScraper } from './scrapers/sodre-santoro-fast';
import { SodreSantoroBatchScraper } from './scrapers/sodre-santoro-batch';
import { SuperbidRealScraper } from './scrapers/superbid-real';
import { VehicleData } from './base-scraper';
import { getFipePrice } from '../fipe';
import { normalizeVehicleBrandModel } from '../vehicle-normalization';
import { calculateDealScore } from './utils';
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
    for (const vehicleData of vehicles) {
      try {
        const { created, updated } = await processVehicle(vehicleData, auctioneerId, auctioneerName);
        
        if (created) result.vehiclesCreated++;
        if (updated) result.vehiclesUpdated++;
      } catch (error: any) {
        console.error(`Erro ao processar veículo ${vehicleData.external_id}:`, error);
        result.errors.push(`${vehicleData.external_id}: ${error.message}`);
      }
    }

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
  // 1. Buscar preço FIPE (DESABILITADO TEMPORARIAMENTE - API com rate limit 429)
  let fipePrice: number | undefined;
  let fipeCode: string | undefined;

  // TODO: Reabilitar depois com cache e delays maiores
  /*
  if (vehicleData.brand && vehicleData.model && vehicleData.year_model) {
    const fipeData = await getFipePrice(
      vehicleData.brand,
      vehicleData.model,
      vehicleData.year_model
    );

    if (fipeData) {
      fipePrice = fipeData.preco;
      fipeCode = fipeData.codigo;
    }
  }
  */

  // 2. Calcular desconto FIPE
  let fipeDiscountPercentage: number | undefined;
  if (fipePrice && vehicleData.current_bid) {
    fipeDiscountPercentage =
      ((fipePrice - vehicleData.current_bid) / fipePrice) * 100;
  }

  // 3. Calcular deal score
  const dealScore = calculateDealScore({
    fipeDiscount: fipeDiscountPercentage || 0,
    year: vehicleData.year_model || new Date().getFullYear(),
    mileage: vehicleData.mileage || 0,
    auctionType: vehicleData.auction_type || 'Online',
    hasFinancing: vehicleData.has_financing || false,
  });

  // 4. Extrair URL base do leiloeiro para leiloeiro_url
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

  // 6. Normalizar tipo de veículo para valores aceitos pelo schema
  const normalizeVehicleType = (type?: string): 'carro' | 'moto' | 'caminhao' | 'van' | 'outros' => {
    if (!type) return 'carro';
    const typeLower = type.toLowerCase();
    if (typeLower.includes('moto')) return 'moto';
    if (typeLower.includes('caminhao') || typeLower.includes('caminhão')) return 'caminhao';
    if (typeLower.includes('van')) return 'van';
    return 'carro';
  };

  // 7. Normalizar marca e modelo usando serviço de normalização
  const vehicleType = normalizeVehicleType(vehicleData.vehicle_type);
  const vehicleTypeForFipe = vehicleType === 'moto' ? 'motos' :
                            vehicleType === 'caminhao' ? 'caminhoes' : 'carros';
  
  let normalizedBrand = vehicleData.brand || null;
  let normalizedModel = vehicleData.model || null;
  let normalizedVariant: string | null = null;
  
  try {
    const normalizationResult = await normalizeVehicleBrandModel(
      vehicleData.brand,
      vehicleData.model,
      vehicleTypeForFipe as 'carros' | 'motos' | 'caminhoes'
    );
    
    normalizedBrand = normalizationResult.brand;
    normalizedModel = normalizationResult.model;
    normalizedVariant = normalizationResult.variant ?? null;
    
    if (normalizationResult.wasSeparated || normalizationResult.wasNormalized) {
      console.log(`[${auctioneerName}] Marca/Modelo normalizado:`, {
        original: { brand: vehicleData.brand, model: vehicleData.model },
        normalized: { brand: normalizedBrand, model: normalizedModel },
        wasSeparated: normalizationResult.wasSeparated,
        wasNormalized: normalizationResult.wasNormalized
      });
    }
  } catch (error) {
    console.warn(`[${auctioneerName}] Erro ao normalizar marca/modelo, usando valores originais:`, error);
    // Em caso de erro, usa os valores originais
    normalizedBrand = vehicleData.brand || null;
    normalizedModel = vehicleData.model || null;
  }

  // 8. Preparar dados para salvar - MAPEAMENTO CORRETO PARA PORTUGUÊS
  // Nota: Alguns campos podem não existir na tabela, então tentamos incluí-los
  // Se falhar no insert, podemos removê-los e tentar novamente
  const vehicleToSave: any = {
    // Campos obrigatórios do schema (tentar incluir mesmo se não existir)
    titulo: vehicleData.title,
    
    // Campos do leiloeiro (podem não existir em todas as versões do schema)
    // Tentamos incluí-los e, se falhar, removemos no catch
    leiloeiro: auctioneerName,
    leiloeiro_url: leiloeiroUrl,
    
    // Dados do veículo (português conforme schema) - usando valores normalizados
    marca: normalizedBrand,
    modelo: normalizedModel,
    modelo_original: vehicleData.model || null,
    versao: normalizedVariant,
    version: normalizedVariant,
    ano: vehicleData.year_model || vehicleData.year_manufacture || null,
    ano_modelo: vehicleData.year_model || null,
    tipo_veiculo: normalizeVehicleType(vehicleData.vehicle_type),
    cor: vehicleData.color || null,
    combustivel: vehicleData.fuel_type || null,
    cambio: vehicleData.transmission || null,
    km: vehicleData.mileage || null,
    
    // Localização
    estado: vehicleData.state || 'SP',
    cidade: vehicleData.city || 'São Paulo',
    
    // Preços
    preco_inicial: vehicleData.minimum_bid || vehicleData.current_bid || 0,
    preco_atual: vehicleData.current_bid || 0,
    
    // Leilão
    tipo_leilao: normalizeAuctionType(vehicleData.auction_type),
    aceita_financiamento: vehicleData.has_financing || false,
    data_leilao: vehicleData.auction_date?.toISOString() || null,
    
    // FIPE e Score
    fipe_preco: fipePrice || null,
    fipe_codigo: fipeCode || null,
    deal_score: dealScore,
    
    // Descrição e imagens
    descricao: vehicleData.title, // Pode ser melhorado depois com scraping de detalhes
    imagens: vehicleData.images && vehicleData.images.length > 0 ? vehicleData.images : [],
    
    // Campo para UPSERT (evitar duplicatas)
    external_id: vehicleData.external_id || null,
  };

  // 8. Verificar se veículo já existe (usando leiloeiro + external_id ou apenas external_id)
  let existingVehicleId: string | null = null;
  let isUpdate = false;
  
  if (vehicleData.external_id) {
    try {
      // Tentar primeiro usando leiloeiro + external_id (se a coluna existir)
      const { data: existing, error: queryError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('leiloeiro', auctioneerName)
        .eq('external_id', vehicleData.external_id)
        .maybeSingle();
      
      if (queryError) {
        // Se falhar, pode ser que a coluna leiloeiro não exista
        // Tentar apenas com external_id
        console.warn(`[${auctioneerName}] Coluna leiloeiro não encontrada, usando apenas external_id:`, queryError.message);
        const { data: existingAlt } = await supabase
          .from('vehicles')
          .select('id')
          .eq('external_id', vehicleData.external_id)
          .maybeSingle();
        
        if (existingAlt) {
          existingVehicleId = existingAlt.id;
          isUpdate = true;
        }
      } else if (existing) {
        existingVehicleId = existing.id;
        isUpdate = true;
      }
    } catch (err: any) {
      // Se houver qualquer erro, tentar apenas com external_id
      console.warn(`[${auctioneerName}] Erro ao verificar veículo existente, usando apenas external_id:`, err.message);
      const { data: existingAlt } = await supabase
        .from('vehicles')
        .select('id')
        .eq('external_id', vehicleData.external_id)
        .maybeSingle();
      
      if (existingAlt) {
        existingVehicleId = existingAlt.id;
        isUpdate = true;
      }
    }
  }

  // 9. Inserir ou atualizar no banco
  let vehicleId: string;
  
  if (isUpdate && existingVehicleId) {
    // Atualizar veículo existente
    let data, error;
    
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
      
      // Remover campos que podem não existir
      const vehicleToSaveMinimal = { ...vehicleToSave };
      delete vehicleToSaveMinimal.leiloeiro;
      delete vehicleToSaveMinimal.leiloeiro_url;
      delete vehicleToSaveMinimal.version;
      delete vehicleToSaveMinimal.versao;
      delete vehicleToSaveMinimal.modelo_original;
      
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
      throw new Error(`Erro ao atualizar veículo: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('Erro ao atualizar veículo: nenhum dado retornado');
    }
    
    vehicleId = data.id;
  } else {
    // Inserir novo veículo
    let data, error;
    
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
      
      // Remover campos que podem não existir
      const vehicleToSaveMinimal = { ...vehicleToSave };
      delete vehicleToSaveMinimal.leiloeiro;
      delete vehicleToSaveMinimal.leiloeiro_url;
      delete vehicleToSaveMinimal.version;
      delete vehicleToSaveMinimal.versao;
      delete vehicleToSaveMinimal.modelo_original;
      
      const retryResult = await supabase
        .from('vehicles')
        .insert(vehicleToSaveMinimal)
        .select('id')
        .single();
      
      data = retryResult.data;
      error = retryResult.error;
    }
    
    if (error) {
      throw new Error(`Erro ao salvar veículo: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('Erro ao salvar veículo: nenhum dado retornado');
    }
    
    vehicleId = data.id;
  }

  // 10. Salvar imagens em tabela separada (se existir a tabela vehicle_images)
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

