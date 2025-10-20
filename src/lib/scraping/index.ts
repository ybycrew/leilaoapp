import { createClient } from '@supabase/supabase-js';
import { SodreSantoroRealScraper } from './scrapers/sodre-santoro-real';
import { VehicleData } from './base-scraper';
import { getFipePrice } from '../fipe';
import { calculateDealScore } from './utils';

// Inicializar Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
        // Usando scraper real para o site Sodré Santoro com filtro de datas futuras
        const scrapers = [
          new SodreSantoroRealScraper(),
          // Adicione mais scrapers aqui:
          // new SuperbidScraper(),
          // new LeiloesVIPScraper(),
          // etc.
        ];

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
    // Tentar por nome; se der erro de múltiplos/nenhum, tentar por slug
    const { data: auctioneerByName, error: auctioneerError } = await supabase
      .from('auctioneers')
      .select('id, slug, name')
      .eq('name', auctioneerName)
      .maybeSingle();

    let auctioneer = auctioneerByName;
    if (!auctioneer) {
      const normalizedSlug = auctioneerName.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, '-');
      const { data: auctioneerBySlug } = await supabase
        .from('auctioneers')
        .select('id, slug, name')
        .eq('slug', normalizedSlug)
        .maybeSingle();
      auctioneer = auctioneerBySlug as any;
    }

    if (auctioneerError) {
      console.error(`[${auctioneerName}] Erro ao buscar leiloeiro:`, auctioneerError);
    }

    if (!auctioneer) {
      throw new Error(`Leiloeiro "${auctioneerName}" não encontrado no banco`);
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
        const { created, updated } = await processVehicle(vehicleData, auctioneerId);
        
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
  auctioneerId: string
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

  // 4. Preparar dados para salvar
  const vehicleToSave = {
    auctioneer_id: auctioneerId,
    external_id: vehicleData.external_id,
    lot_number: vehicleData.lot_number,
    title: vehicleData.title,
    description: vehicleData.title, // Pode ser melhorado
    brand: vehicleData.brand,
    model: vehicleData.model,
    version: vehicleData.version,
    year_manufacture: vehicleData.year_manufacture,
    year_model: vehicleData.year_model,
    vehicle_type: vehicleData.vehicle_type,
    color: vehicleData.color,
    fuel_type: vehicleData.fuel_type,
    transmission: vehicleData.transmission,
    mileage: vehicleData.mileage,
    license_plate: vehicleData.license_plate,
    state: vehicleData.state,
    city: vehicleData.city,
    current_bid: vehicleData.current_bid,
    minimum_bid: vehicleData.minimum_bid,
    appraised_value: vehicleData.appraised_value,
    fipe_price: fipePrice,
    fipe_code: fipeCode,
    fipe_discount_percentage: fipeDiscountPercentage,
    auction_date: vehicleData.auction_date?.toISOString(),
    auction_type: vehicleData.auction_type,
    auction_status: 'scheduled',
    has_financing: vehicleData.has_financing,
    accepts_financing: false,
    condition: vehicleData.condition,
    deal_score: dealScore,
    original_url: vehicleData.original_url,
    thumbnail_url: vehicleData.thumbnail_url,
    is_active: true,
    scraped_at: new Date().toISOString(),
  };

  // 5. Inserir ou atualizar no banco (UPSERT)
  const { data, error } = await supabase
    .from('vehicles')
    .upsert(vehicleToSave, {
      onConflict: 'auctioneer_id,external_id',
      ignoreDuplicates: false,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Erro ao salvar veículo: ${error.message}`);
  }

  const vehicleId = data.id;

  // 6. Salvar imagens (se houver)
  if (vehicleData.images && vehicleData.images.length > 0) {
    await saveVehicleImages(vehicleId, vehicleData.images);
  }

  // Determinar se foi criação ou atualização
  // Por simplicidade, consideramos sempre como atualização se não houver erro
  return { created: true, updated: false };
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

