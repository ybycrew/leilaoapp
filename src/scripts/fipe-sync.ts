import { AxiosError } from 'axios';
import { createClient } from '@supabase/supabase-js';
import { fipeApi } from '../lib/fipe-api';
import { buildSearchKey, extractModelBase, normalizeBrandName, toAsciiUpper } from '../lib/fipe-normalization';

interface VehicleTypeDefinition {
  slug: FipeVehicleType;
  apiSlug: ApiVehicleType;
  description: string;
}

type FipeVehicleType = 'carros' | 'motos' | 'caminhoes';
type ApiVehicleType = 'cars' | 'motorcycles' | 'trucks';

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
  modelos?: FipeModelApi[];
  models?: FipeModelApi[];
}

interface FipeYearApi {
  codigo: string;
  nome: string;
}

interface FipePriceApi {
  Valor?: string;
  Marca?: string;
  Modelo?: string;
  AnoModelo?: number;
  Combustivel?: string;
  MesReferencia?: string;
  CodigoFipe?: string;
  price?: string;
  brand?: string;
  model?: string;
  modelYear?: number;
  fuel?: string;
  referenceMonth?: string;
  codeFipe?: string;
}

interface VehicleTypeRow {
  id: string;
  slug: string;
}

interface BrandRow {
  id: string;
  fipe_code: string;
  search_name?: string;
}

interface ModelRow {
  id: string;
  fipe_code: string;
  base_search_name?: string;
}

interface ModelYearRow {
  id: string;
  year_code: string;
}

function normalizeBrandItem(item: any): FipeBrandApi | null {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const codigo = item.codigo ?? item.code ?? item.id;
  const nome = item.nome ?? item.name ?? item.description;
  if (!codigo || !nome) {
    return null;
  }
  return { codigo: String(codigo), nome: String(nome) };
}

function normalizeBrandList(data: unknown): FipeBrandApi[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map(normalizeBrandItem).filter((item): item is FipeBrandApi => Boolean(item));
  }
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.marcas)) {
      return normalizeBrandList(obj.marcas);
    }
    if (Array.isArray(obj.brands)) {
      return normalizeBrandList(obj.brands);
    }
    if (Array.isArray(obj.data)) {
      return normalizeBrandList(obj.data);
    }
  }
  return [];
}

function normalizeModelItem(item: any): FipeModelApi | null {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const codigo = item.codigo ?? item.code ?? item.id;
  const nome = item.nome ?? item.name ?? item.description;
  if (!codigo || !nome) {
    return null;
  }
  return { codigo: String(codigo), nome: String(nome) };
}

function normalizeModelList(data: unknown): FipeModelApi[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map(normalizeModelItem).filter((item): item is FipeModelApi => Boolean(item));
  }
  if (typeof data === 'object' && data !== null) {
    const obj = data as FipeModelsResponse & Record<string, unknown>;
    if (Array.isArray(obj.modelos)) {
      return normalizeModelList(obj.modelos);
    }
    if (Array.isArray(obj.models)) {
      return normalizeModelList(obj.models);
    }
    if (Array.isArray(obj.data)) {
      return normalizeModelList(obj.data);
    }
  }
  return [];
}

function normalizeYearItem(item: any): FipeYearApi | null {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const codigo = item.codigo ?? item.code ?? item.id ?? item.year;
  const nome = item.nome ?? item.name ?? item.description ?? item.label;
  if (!codigo || !nome) {
    return null;
  }
  return { codigo: String(codigo), nome: String(nome) };
}

function normalizeYearList(data: unknown): FipeYearApi[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map(normalizeYearItem).filter((item): item is FipeYearApi => Boolean(item));
  }
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.anos)) {
      return normalizeYearList(obj.anos);
    }
    if (Array.isArray(obj.years)) {
      return normalizeYearList(obj.years);
    }
    if (Array.isArray(obj.data)) {
      return normalizeYearList(obj.data);
    }
  }
  return [];
}

function pickFirstField<T>(source: any, keys: string[]): T | undefined {
  if (!source || typeof source !== 'object') {
    return undefined;
  }
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const value = (source as any)[key];
      if (value !== undefined && value !== null) {
        return value as T;
      }
    }
  }
  return undefined;
}

const VEHICLE_TYPES: VehicleTypeDefinition[] = [
  { slug: 'carros', apiSlug: 'cars', description: 'Automóveis' },
  { slug: 'motos', apiSlug: 'motorcycles', description: 'Motocicletas' },
  { slug: 'caminhoes', apiSlug: 'trucks', description: 'Caminhões' },
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

function resolveVehicleType(value: string): FipeVehicleType | null {
  const normalized = value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  switch (normalized) {
    case 'carro':
    case 'carros':
    case 'cars':
      return 'carros';
    case 'moto':
    case 'motos':
    case 'motorcycle':
    case 'motorcycles':
      return 'motos';
    case 'caminhao':
    case 'caminhoes':
    case 'camiao':
    case 'camioes':
    case 'truck':
    case 'trucks':
      return 'caminhoes';
    default:
      return null;
  }
}

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
            const requested = value
              .split(',')
              .map((t) => resolveVehicleType(t))
              .filter((t): t is FipeVehicleType => Boolean(t));
            if (requested.length > 0) {
              opts.types = Array.from(new Set(requested));
            }
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

  const payload = brands.map((brand) => {
    const normalized = normalizeBrandName(brand.nome);
    return {
      vehicle_type_id: vehicleTypeId,
      fipe_code: brand.codigo,
      name: brand.nome,
      name_upper: normalized.upper,
      search_name: normalized.search,
    };
  });

  const db = supabase as any;

  const { error } = await db
    .from('fipe_brands')
    .upsert(payload, { onConflict: 'vehicle_type_id,fipe_code' });

  if (error) {
    throw new Error(`Erro ao upsert de marcas: ${error.message}`);
  }

  const codes = payload.map((item) => item.fipe_code);

  const { data, error: selectError } = await db
    .from('fipe_brands')
    .select('id, fipe_code')
    .eq('vehicle_type_id', vehicleTypeId)
    .in('fipe_code', codes);

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

  const payload = models.map((model) => {
    const base = extractModelBase(model.nome);
    return {
      brand_id: brandId,
      fipe_code: model.codigo,
      name: model.nome,
      name_upper: base.nameUpper,
      base_name: base.baseName || model.nome,
      base_name_upper: base.baseNameUpper || toAsciiUpper(model.nome),
      base_search_name: base.baseSearchName || buildSearchKey(model.nome),
    };
  });

  const db = supabase as any;

  const { error } = await db
    .from('fipe_models')
    .upsert(payload, { onConflict: 'brand_id,fipe_code' });

  if (error) {
    throw new Error(`Erro ao upsert de modelos (marca ${brandCode}): ${error.message}`);
  }

  const codes = payload.map((item) => item.fipe_code);

  const { data, error: selectError } = await db
    .from('fipe_models')
    .select('id, fipe_code')
    .eq('brand_id', brandId)
    .in('fipe_code', codes);

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
    const entry: Record<string, any> = {
      model_id: modelId,
      year_code: year.codigo,
    };
    if (modelYear !== null && modelYear !== undefined) {
      entry.model_year = modelYear;
    }
    if (fuelLabel) {
      entry.fuel_label = fuelLabel;
    }
    return entry;
  });

  const db = supabase as any;

  const { error } = await db
    .from('fipe_model_years')
    .upsert(payload, { onConflict: 'model_id,year_code' });

  if (error) {
    throw new Error(`Erro ao upsert de anos (modelo ${modelCode}): ${error.message}`);
  }

  const codes = payload.map((item) => item.year_code);

  const { data, error: selectError } = await db
    .from('fipe_model_years')
    .select('id, year_code')
    .eq('model_id', modelId)
    .in('year_code', codes);

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

  const brandsResponse = await fetchWithRetry(
    () => fipeApi.get(`/${vehicleType.apiSlug}/brands`).then((res) => res.data),
    `listar marcas (${vehicleType.slug})`,
    options.throttleMs,
  );

  const brands = normalizeBrandList(brandsResponse);
  if (brands.length === 0) {
    console.warn(`[${vehicleType.slug}] Nenhuma marca retornada pela API. Pulando tipo.`);
    return;
  }

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
      () => fipeApi.get(`/${vehicleType.apiSlug}/brands/${brand.codigo}/models`).then((res) => res.data),
      `listar modelos (${vehicleType.slug} / ${brand.codigo})`,
      options.throttleMs,
    );

    const models = normalizeModelList(modelsResponse);
    if (models.length === 0) {
      console.warn(`   ⚠️  Nenhum modelo retornado para a marca ${brand.codigo}. Pulando.`);
      continue;
    }
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

      const yearsResponse = await fetchWithRetry(
        () => fipeApi.get(`/${vehicleType.apiSlug}/brands/${brand.codigo}/models/${model.codigo}/years`).then((res) => res.data),
        `listar anos (${vehicleType.slug} / ${brand.codigo} / ${model.codigo})`,
        options.throttleMs,
      );

      const years = normalizeYearList(yearsResponse);
      if (years.length === 0) {
        console.warn(`      ⚠️  Nenhum ano retornado para o modelo ${model.codigo}. Pulando.`);
        continue;
      }

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

        let priceData: FipePriceApi | null = null;
        try {
          priceData = await fetchWithRetry(
            () => fipeApi
              .get<FipePriceApi>(`/${vehicleType.apiSlug}/brands/${brand.codigo}/models/${model.codigo}/years/${encodeURIComponent(year.codigo)}`)
              .then((res) => res.data),
            `preço FIPE (${vehicleType.slug} / ${brand.codigo} / ${model.codigo} / ${year.codigo})`,
            options.throttleMs,
          );
        } catch (error: any) {
          const status = error?.response?.status;
          if (status === 401 || status === 403) {
            console.warn(`      ⚠️  Token FIPE não autorizado (status ${status}). Pulando coleta de preços para este tipo.`);
            // Evita novas tentativas de preço para este tipo de veículo.
            options.skipPrices = true;
            break;
          }
          throw error;
        }

        if (!priceData) {
          await delay(options.throttleMs);
          continue;
        }

        const referenceLabel = pickFirstField<string>(priceData, ['MesReferencia', 'referenceMonth', 'reference']);
        const priceText = pickFirstField<string>(priceData, ['Valor', 'valor', 'price']);
        const fuelRaw = pickFirstField<string>(priceData, ['Combustivel', 'fuel']);
        const modelYearRaw = pickFirstField<number | string>(priceData, ['AnoModelo', 'modelYear']);

        const referenceDate = formatReferenceDate(referenceLabel ?? null) ?? null;
        const priceCents = priceTextToCents(priceText ?? null) ?? null;
        const fuelLabel = fuelRaw ? String(fuelRaw) : null;
        let modelYear: number | null = null;
        if (typeof modelYearRaw === 'number') {
          modelYear = Number.isFinite(modelYearRaw) ? modelYearRaw : null;
        } else if (typeof modelYearRaw === 'string' && modelYearRaw.trim().length > 0) {
          const parsedYear = Number.parseInt(modelYearRaw, 10);
          modelYear = Number.isNaN(parsedYear) ? null : parsedYear;
        }

        const normalizedFuelLabel = fuelLabel ? fuelLabel.trim() : null;

        if (normalizedFuelLabel || modelYear) {
          const { error: updateError } = await db
            .from('fipe_model_years')
            .update({
              fuel_label: normalizedFuelLabel ?? undefined,
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
          raw_price_text: priceText ?? null,
          reference_label: referenceLabel ?? null,
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
