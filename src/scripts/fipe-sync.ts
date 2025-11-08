import axios, { AxiosError } from 'axios';
import { createClient } from '@supabase/supabase-js';

interface VehicleTypeDefinition {
  slug: FipeVehicleType;
  description: string;
}

type FipeVehicleType = 'carros' | 'motos' | 'caminhoes';

type CliOptions = {
  types: FipeVehicleType[];
  skipPrices: boolean;
  throttleMs: number;
  brandLimit?: number;
  modelLimit?: number;
  yearLimit?: number;
};

interface FipeBrandApi {
  codigo: string;
  nome: string;
}

interface FipeModelApi {
  codigo: string;
  nome: string;
}

interface FipeModelsResponse {
  modelos: FipeModelApi[];
}

interface FipeYearApi {
  codigo: string;
  nome: string;
}

interface FipePriceApi {
  Valor: string;
  Marca: string;
  Modelo: string;
  AnoModelo: number;
  Combustivel: string;
  MesReferencia: string;
  CodigoFipe: string;
}

interface VehicleTypeRow {
  id: string;
  slug: string;
}

interface BrandRow {
  id: string;
  fipe_code: string;
}

interface ModelRow {
  id: string;
  fipe_code: string;
}

interface ModelYearRow {
  id: string;
  year_code: string;
}

const VEHICLE_TYPES: VehicleTypeDefinition[] = [
  { slug: 'carros', description: 'Automóveis' },
  { slug: 'motos', description: 'Motocicletas' },
  { slug: 'caminhoes', description: 'Caminhões' },
];

const MONTH_MAP: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  março: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

const DEFAULT_THROTTLE_MS = Number(process.env.FIPE_SYNC_DELAY_MS ?? 150);
const MAX_RETRIES = 4;

const api = axios.create({
  baseURL: 'https://parallelum.com.br/fipe/api/v1',
  timeout: 15000,
  headers: {
    'User-Agent': 'leilaoapp-fipe-sync/1.0',
  },
});

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeMonth(label: string | null | undefined): { year: number; month: number } | null {
  if (!label) return null;
  const normalized = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z\s0-9]/g, '')
    .replace(/de/g, ' ') // remove "de" keeping spaces
    .replace(/\s+/g, ' ')
    .trim();

  const parts = normalized.split(' ');
  if (parts.length < 2) return null;

  const monthKey = parts[0];
  const yearValue = Number(parts[1]);
  const monthNumber = MONTH_MAP[monthKey];

  if (!monthNumber || Number.isNaN(yearValue)) {
    return null;
  }

  return { year: yearValue, month: monthNumber };
}

function formatReferenceDate(label: string | null | undefined): string | null {
  const parsed = normalizeMonth(label);
  if (!parsed) return null;
  const { year, month } = parsed;
  const monthStr = month.toString().padStart(2, '0');
  return `${year}-${monthStr}-01`;
}

function priceTextToCents(value: string | null | undefined): number | null {
  if (!value) return null;
  const sanitized = value.replace(/[R$\s\.]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(sanitized);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return Math.round(parsed * 100);
}

function parseYearName(year: FipeYearApi): { modelYear: number | null; fuelLabel: string | null } {
  const parts = year.nome.split(' ');
  if (parts.length === 0) {
    return { modelYear: null, fuelLabel: null };
  }

  const maybeYearFromCode = Number.parseInt(year.codigo.slice(0, 4), 10);
  const maybeYearFromName = Number.parseInt(parts[0], 10);
  const modelYear = Number.isNaN(maybeYearFromCode) ? (Number.isNaN(maybeYearFromName) ? null : maybeYearFromName) : maybeYearFromCode;
  const fuelLabel = parts.length > 1 ? parts.slice(1).join(' ') : null;

  return { modelYear, fuelLabel };
}

function parseArgs(): CliOptions {
  const argv = process.argv.slice(2);
  const opts: CliOptions = {
    types: VEHICLE_TYPES.map((t) => t.slug),
    skipPrices: false,
    throttleMs: DEFAULT_THROTTLE_MS,
  };

  const readValue = (arg: string, next?: string): string | undefined => {
    if (arg.includes('=')) {
      return arg.split('=').slice(1).join('=');
    }
    return next;
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (true) {
      case arg.startsWith('--types'):
        {
          const value = readValue(arg, argv[i + 1]);
          if (value) {
            opts.types = value.split(',').map((t) => t.trim()).filter((t): t is FipeVehicleType => ['carros', 'motos', 'caminhoes'].includes(t));
            if (!arg.includes('=')) i++;
          }
        }
        break;
      case arg === '--skip-prices':
        opts.skipPrices = true;
        break;
      case arg.startsWith('--throttle'):
        {
          const value = readValue(arg, argv[i + 1]);
          const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
          if (!Number.isNaN(parsed)) {
            opts.throttleMs = Math.max(parsed, 0);
            if (!arg.includes('=')) i++;
          }
        }
        break;
      case arg.startsWith('--brand-limit'):
        {
          const value = readValue(arg, argv[i + 1]);
          const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
          if (!Number.isNaN(parsed)) {
            opts.brandLimit = parsed;
            if (!arg.includes('=')) i++;
          }
        }
        break;
      case arg.startsWith('--model-limit'):
        {
          const value = readValue(arg, argv[i + 1]);
          const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
          if (!Number.isNaN(parsed)) {
            opts.modelLimit = parsed;
            if (!arg.includes('=')) i++;
          }
        }
        break;
      case arg.startsWith('--year-limit'):
        {
          const value = readValue(arg, argv[i + 1]);
          const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
          if (!Number.isNaN(parsed)) {
            opts.yearLimit = parsed;
            if (!arg.includes('=')) i++;
          }
        }
        break;
      default:
        break;
    }
  }

  if (opts.types.length === 0) {
    opts.types = VEHICLE_TYPES.map((t) => t.slug);
  }

  return opts;
}

async function fetchWithRetry<T>(fn: () => Promise<T>, context: string, throttleMs: number): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < MAX_RETRIES) {
    attempt++;
    try {
      const result = await fn();
      if (attempt > 1) {
        console.log(`✅ Sucesso após ${attempt} tentativas (${context})`);
      }
      return result;
    } catch (error) {
      lastError = error;
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const isRetryable = !status || status >= 500 || status === 429;
      const wait = throttleMs * Math.pow(2, attempt - 1);
      console.warn(`⚠️  ${context}: tentativa ${attempt} falhou (${axiosError.message ?? error}). Aguardando ${wait}ms${attempt < MAX_RETRIES ? ' para tentar novamente' : ''}.`);
      if (!isRetryable || attempt >= MAX_RETRIES) {
        break;
      }
      await delay(wait);
    }
  }

  throw lastError ?? new Error(`Falha ao executar ${context}`);
}

async function ensureVehicleType(
  supabase: any,
  def: VehicleTypeDefinition,
): Promise<string> {
  const db = supabase as any;
  const { data, error } = await db
    .from('fipe_vehicle_types')
    .upsert([
      {
        slug: def.slug,
        description: def.description,
      },
    ], { onConflict: 'slug' })
    .select('id, slug')
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Erro ao garantir tipo de veículo ${def.slug}: ${error?.message ?? 'sem dados retornados'}`);
  }

  return data.id;
}

async function upsertBrands(
  supabase: any,
  vehicleTypeId: string,
  brands: FipeBrandApi[],
): Promise<Map<string, string>> {
  if (brands.length === 0) {
    return new Map();
  }

  const payload = brands.map((brand) => ({
    vehicle_type_id: vehicleTypeId,
    fipe_code: brand.codigo,
    name: brand.nome,
  }));

  const db = supabase as any;

  const { error } = await db
    .from('fipe_brands')
    .upsert(payload, { onConflict: 'vehicle_type_id,fipe_code' });

  if (error) {
    throw new Error(`Erro ao upsert de marcas: ${error.message}`);
  }

  const { data, error: selectError } = await db
    .from('fipe_brands')
    .select('id, fipe_code')
    .eq('vehicle_type_id', vehicleTypeId);

  if (selectError || !data) {
    throw new Error(`Erro ao buscar marcas após upsert: ${selectError?.message ?? 'sem dados'}`);
  }

  const map = new Map<string, string>();
  data.forEach((row: BrandRow) => {
    map.set(row.fipe_code, row.id);
  });

  return map;
}

async function upsertModels(
  supabase: any,
  brandId: string,
  brandCode: string,
  models: FipeModelApi[],
): Promise<Map<string, string>> {
  if (models.length === 0) {
    return new Map();
  }

  const payload = models.map((model) => ({
    brand_id: brandId,
    fipe_code: model.codigo,
    name: model.nome,
  }));

  const db = supabase as any;

  const { error } = await db
    .from('fipe_models')
    .upsert(payload, { onConflict: 'brand_id,fipe_code' });

  if (error) {
    throw new Error(`Erro ao upsert de modelos (marca ${brandCode}): ${error.message}`);
  }

  const { data, error: selectError } = await db
    .from('fipe_models')
    .select('id, fipe_code')
    .eq('brand_id', brandId);

  if (selectError || !data) {
    throw new Error(`Erro ao buscar modelos da marca ${brandCode}: ${selectError?.message ?? 'sem dados'}`);
  }

  const map = new Map<string, string>();
  data.forEach((row: ModelRow) => {
    map.set(row.fipe_code, row.id);
  });

  return map;
}

async function upsertModelYears(
  supabase: any,
  modelId: string,
  modelCode: string,
  years: FipeYearApi[],
): Promise<Map<string, string>> {
  if (years.length === 0) {
    return new Map();
  }

  const payload = years.map((year) => {
    const { modelYear, fuelLabel } = parseYearName(year);
    return {
      model_id: modelId,
      year_code: year.codigo,
      model_year: modelYear,
      fuel_label: fuelLabel,
    };
  });

  const db = supabase as any;

  const { error } = await db
    .from('fipe_model_years')
    .upsert(payload, { onConflict: 'model_id,year_code' });

  if (error) {
    throw new Error(`Erro ao upsert de anos (modelo ${modelCode}): ${error.message}`);
  }

  const { data, error: selectError } = await db
    .from('fipe_model_years')
    .select('id, year_code')
    .eq('model_id', modelId);

  if (selectError || !data) {
    throw new Error(`Erro ao buscar anos do modelo ${modelCode}: ${selectError?.message ?? 'sem dados'}`);
  }

  const map = new Map<string, string>();
  data.forEach((row: ModelYearRow) => {
    map.set(row.year_code, row.id);
  });

  return map;
}

async function syncVehicleType(
  supabase: any,
  vehicleType: VehicleTypeDefinition,
  options: CliOptions,
): Promise<void> {
  console.log(`\n==============================`);
  console.log(`🚗 Sincronizando FIPE (${vehicleType.slug})`);
  console.log(`==============================`);

  const vehicleTypeId = await ensureVehicleType(supabase, vehicleType);
  console.log(`Tipo garantido: ${vehicleType.slug} → ${vehicleTypeId}`);

  const db = supabase as any;

  const brands = await fetchWithRetry(
    () => api.get<FipeBrandApi[]>(`/${vehicleType.slug}/marcas`).then((res) => res.data),
    `listar marcas (${vehicleType.slug})`,
    options.throttleMs,
  );

  const selectedBrands = typeof options.brandLimit === 'number' ? brands.slice(0, options.brandLimit) : brands;
  console.log(`Encontradas ${brands.length} marcas. Processando ${selectedBrands.length}.`);

  const brandMap = await upsertBrands(supabase, vehicleTypeId, selectedBrands);

  let brandIndex = 0;
  for (const brand of selectedBrands) {
    brandIndex++;
    const brandId = brandMap.get(brand.codigo);
    if (!brandId) {
      console.warn(`⚠️  ID não encontrado para marca ${brand.codigo} (${brand.nome}). Pulando.`);
      continue;
    }

    console.log(`\n➡️  [${vehicleType.slug}] Marca ${brandIndex}/${selectedBrands.length}: ${brand.nome} (${brand.codigo})`);

    const modelsResponse = await fetchWithRetry(
      () => api.get<FipeModelsResponse>(`/${vehicleType.slug}/marcas/${brand.codigo}/modelos`).then((res) => res.data),
      `listar modelos (${vehicleType.slug} / ${brand.codigo})`,
      options.throttleMs,
    );

    const models = modelsResponse.modelos ?? [];
    const selectedModels = typeof options.modelLimit === 'number' ? models.slice(0, options.modelLimit) : models;

    console.log(`   • Modelos encontrados: ${models.length}. Processando ${selectedModels.length}.`);

    const modelMap = await upsertModels(supabase, brandId, brand.codigo, selectedModels);

    let modelIndex = 0;
    for (const model of selectedModels) {
      modelIndex++;
      const modelId = modelMap.get(model.codigo);
      if (!modelId) {
        console.warn(`   ⚠️  ID não encontrado para modelo ${model.codigo} (${model.nome}). Pulando.`);
        continue;
      }

      console.log(`   ➜ Modelo ${modelIndex}/${selectedModels.length}: ${model.nome} (${model.codigo})`);

      const years = await fetchWithRetry(
        () => api.get<FipeYearApi[]>(`/${vehicleType.slug}/marcas/${brand.codigo}/modelos/${model.codigo}/anos`).then((res) => res.data),
        `listar anos (${vehicleType.slug} / ${brand.codigo} / ${model.codigo})`,
        options.throttleMs,
      );

      const selectedYears = typeof options.yearLimit === 'number' ? years.slice(0, options.yearLimit) : years;
      console.log(`      • Anos encontrados: ${years.length}. Processando ${selectedYears.length}.`);

      const yearMap = await upsertModelYears(supabase, modelId, model.codigo, selectedYears);

      if (options.skipPrices) {
        continue;
      }

      let yearIndex = 0;
      for (const year of selectedYears) {
        yearIndex++;
        const modelYearId = yearMap.get(year.codigo);
        if (!modelYearId) {
          console.warn(`      ⚠️  ID não encontrado para ano ${year.codigo} (${year.nome}). Pulando.`);
          continue;
        }

        console.log(`      ↳ Ano ${yearIndex}/${selectedYears.length}: ${year.nome} (${year.codigo})`);

        const priceData = await fetchWithRetry(
          () => api
            .get<FipePriceApi>(`/${vehicleType.slug}/marcas/${brand.codigo}/modelos/${model.codigo}/anos/${encodeURIComponent(year.codigo)}`)
            .then((res) => res.data),
          `preço FIPE (${vehicleType.slug} / ${brand.codigo} / ${model.codigo} / ${year.codigo})`,
          options.throttleMs,
        );

        const referenceDate = formatReferenceDate(priceData.MesReferencia) ?? null;
        const priceCents = priceTextToCents(priceData.Valor) ?? null;
        const fuelLabel = priceData.Combustivel || null;
        const modelYear = Number.isFinite(priceData.AnoModelo) ? priceData.AnoModelo : null;

        if (fuelLabel || modelYear) {
          const { error: updateError } = await db
            .from('fipe_model_years')
            .update({
              fuel_label: fuelLabel ?? undefined,
              model_year: modelYear ?? undefined,
            })
            .eq('id', modelYearId);

          if (updateError) {
            console.warn(`      ⚠️  Erro ao atualizar dados do ano ${year.codigo}: ${updateError.message}`);
          }
        }

        if (!referenceDate) {
          console.warn('      ⚠️  Não foi possível determinar o mês de referência. Pulando gravação do preço.');
          await delay(options.throttleMs);
          continue;
        }

        const payload = {
          model_year_id: modelYearId,
          reference_month: referenceDate,
          currency: 'BRL',
          price_cents: priceCents ?? 0,
          raw_price_text: priceData.Valor,
          reference_label: priceData.MesReferencia,
        };

        const { error: priceError } = await db
          .from('fipe_price_references')
          .upsert(payload, { onConflict: 'model_year_id,reference_month' });

        if (priceError) {
          console.error(`      ❌ Erro ao salvar preço para ${year.codigo}: ${priceError.message}`);
        }

        await delay(options.throttleMs);
      }
    }
  }
}

async function main() {
  console.log('📥 Iniciando sincronização da FIPE...');

  const options = parseArgs();
  console.log('Opções selecionadas:', options);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const selectedTypeDefinitions = VEHICLE_TYPES.filter((type) => options.types.includes(type.slug));
  if (selectedTypeDefinitions.length === 0) {
    console.log('Nenhum tipo válido selecionado. Nada a fazer.');
    return;
  }

  for (const vehicleType of selectedTypeDefinitions) {
    try {
      await syncVehicleType(supabase, vehicleType, options);
    } catch (error) {
      console.error(`❌ Erro ao sincronizar tipo ${vehicleType.slug}:`, error);
    }
  }

  console.log('\n✅ Sincronização concluída.');
}

main()
  .then(() => {
    console.log('✨ Script finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal na sincronização FIPE:', error);
    process.exit(1);
  });
