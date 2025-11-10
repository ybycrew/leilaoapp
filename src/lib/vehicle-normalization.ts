/**
 * Serviço de normalização de marcas e modelos de veículos
 * Valida e normaliza dados usando API FIPE como fonte de verdade
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { buildSearchKey, extractModelBase, normalizeBrandName, toAsciiUpper } from './fipe-normalization';

// Lista de palavras que são peças de veículos (não marcas/modelos)
const PARTS_WORDS = new Set([
  'condensador', 'embreagem', 'radiador', 'bateria', 'pneu', 'pneus',
  'freio', 'freios', 'filtro', 'filtros', 'óleo', 'oleo', 'lubrificante',
  'correia', 'correias', 'vela', 'velas', 'bobina', 'bobinas', 'carburador',
  'injetor', 'injetores', 'bomba', 'bombas', 'alternador', 'motor',
  'câmbio', 'cambio', 'transmissão', 'transmissao', 'diferencial',
  'suspensão', 'suspensao', 'amortecedor', 'amortecedores', 'mola', 'molas',
  'disco', 'discos', 'pastilha', 'pastilhas', 'tambor', 'tambores',
  'escapamento', 'catalisador', 'silenciador', 'escapamento',
  'parachoque', 'parachoque', 'para-choque', 'farol', 'farois', 'lanterna',
  'retrovisor', 'retrovisores', 'vidro', 'vidros', 'porta', 'portas',
  'capô', 'capo', 'teto', 'painel', 'volante', 'banco', 'bancos',
  'cinto', 'cintos', 'airbag', 'abs', 'esp', 'tcs', 'ebd', 'bas',
  'sensor', 'sensores', 'atualizador', 'atualizadores', 'reparo', 'reparos',
  'revisão', 'revisao', 'manutenção', 'manutencao', 'serviço', 'servico',
  'peça', 'peca', 'peças', 'pecas', 'acessório', 'acessorios',
  'kit', 'kits', 'conjunto', 'conjuntos', 'par', 'pares'
]);

// Lista de palavras que não são marcas válidas
const INVALID_BRAND_WORDS = new Set([
  'ano', 'anos', 'km', 'quilometragem', 'quilometros', 'quilômetros',
  'cor', 'cores', 'combustível', 'combustivel', 'câmbio', 'cambio',
  'portas', 'porta', 'versão', 'versao', 'versões', 'versoes',
  'edição', 'edicao', 'edições', 'edicoes', 'especial', 'especiais',
  'limited', 'sport', 'comfort', 'executive', 'premium', 'luxury',
  'basic', 'standard', 'plus', 'max', 'min', 'pro', 'turbo', 'super',
  'flex', 'gasolina', 'etanol', 'diesel', 'híbrido', 'hibrido', 'elétrico', 'eletrico',
  'manual', 'automático', 'automatico', 'cvt', 'at', 'mt',
  '4x2', '4x4', '2wd', '4wd', 'awd', 'fwd', 'rwd',
  '2p', '4p', '2 portas', '4 portas', '5p', '5 portas',
  'branco', 'preto', 'prata', 'azul', 'vermelho', 'verde', 'amarelo', 'cinza', 'marrom', 'bege',
  'novo', 'nova', 'usado', 'usada', 'seminovo', 'seminova',
  'leilão', 'leilao', 'leiloeiro', 'leiloeiros', 'arrematado', 'arrematada',
  'financiamento', 'aceita', 'aceito', 'aceita-se', 'aceito-se',
  'venda', 'vendas', 'compra', 'compras', 'troca', 'trocas',
  'consignação', 'consignacao', 'consignado', 'consignada',
  'garantia', 'garantias', 'documentado', 'documentada', 'quitado', 'quitada',
  'ipva', 'licenciamento', 'transferência', 'transferencia',
  'sinistro', 'sinistros', 'batido', 'batida', 'acidente', 'acidentes',
  'reparado', 'reparada', 'reformado', 'reformada', 'restaurado', 'restaurada'
]);

/**
 * Verifica se um valor é apenas números
 */
export function isOnlyNumbers(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

/**
 * Verifica se um valor é uma peça de veículo
 */
export function isPart(value: string): boolean {
  const valueLower = value.toLowerCase().trim();
  return PARTS_WORDS.has(valueLower) || 
         PARTS_WORDS.has(valueLower.replace(/s$/, '')); // Remove plural
}

/**
 * Verifica se um valor é uma palavra inválida para marca
 */
export function isInvalidBrandWord(value: string): boolean {
  const valueLower = value.toLowerCase().trim();
  return INVALID_BRAND_WORDS.has(valueLower);
}

/**
 * Separa combinações como "CHEVROLET/CORSA" em marca e modelo
 */
export function separateBrandModel(combined: string): { brand: string | null; model: string | null } {
  if (!combined || typeof combined !== 'string') {
    return { brand: null, model: null };
  }

  const trimmed = combined.trim();
  
  // Padrões comuns: MARCA/MODELO, MARCA - MODELO, MARCA MODELO
  const patterns = [
    /^([^\/]+)\/(.+)$/i,           // CHEVROLET/CORSA
    /^([^-]+)\s*-\s*(.+)$/i,        // CHEVROLET - CORSA
    /^([A-Z]+)\s+([A-Z]+(?:\s+[A-Z]+)*)$/i, // CHEVROLET CORSA
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const brand = match[1].trim();
      const model = match[2].trim();
      
      // Validar que não são apenas números ou peças
      if (!isOnlyNumbers(brand) && !isPart(brand) && 
          !isOnlyNumbers(model) && !isPart(model)) {
        return { brand, model };
      }
    }
  }

  return { brand: null, model: null };
}

type VehicleTypeSlug = 'carros' | 'motos' | 'caminhoes';

interface VehicleTypeRow {
  id: string;
  slug: VehicleTypeSlug;
}

interface BrandRow {
  id: string;
  name: string;
  name_upper: string;
  search_name: string;
  fipe_code: string;
  vehicle_type_id: string;
}

interface ModelRow {
  id: string;
  name: string;
  name_upper: string;
  base_name: string;
  base_name_upper: string;
  base_search_name: string;
  fipe_code: string;
}

interface ModelRecord extends ModelRow {
  name_search: string;
}

interface LocalFipeBrand {
  codigo: string;
  nome: string;
}

interface LocalFipeModel {
  codigo: string;
  nome: string;
}

const BRAND_ALIASES: Record<string, string> = {
  VW: 'VOLKSWAGEN',
  VWVOLKSWAGEN: 'VOLKSWAGEN',
  VOLKSWAGENVW: 'VOLKSWAGEN',
  GM: 'CHEVROLET',
  GENERALMOTORS: 'CHEVROLET',
  CHEVROLETGM: 'CHEVROLET',
  MB: 'MERCEDESBENZ',
  MERCEDES: 'MERCEDESBENZ',
  MERCEDESBENZ: 'MERCEDESBENZ',
  BMWMOTORS: 'BMW',
  FCA: 'FIAT',
  FIATCHRYSLER: 'FIAT',
  PSA: 'PEUGEOT',
  PSAPEUGEOT: 'PEUGEOT'
};

let supabaseClient: SupabaseClient | null = null;

const vehicleTypeIdCache = new Map<VehicleTypeSlug, string>();
const brandCache = new Map<VehicleTypeSlug, Map<string, BrandRow>>();
const brandListCache = new Map<VehicleTypeSlug, BrandRow[]>();
const modelCache = new Map<string, Map<string, ModelRecord>>();

function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase credentials are required for FIPE normalization');
  }

  supabaseClient = createClient(url, key);
  return supabaseClient;
}

async function ensureVehicleTypeId(vehicleType: VehicleTypeSlug): Promise<string> {
  const cached = vehicleTypeIdCache.get(vehicleType);
  if (cached) {
    return cached;
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('fipe_vehicle_types')
    .select('id, slug')
    .eq('slug', vehicleType)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Tipo de veículo FIPE não encontrado: ${vehicleType}`);
  }

  vehicleTypeIdCache.set(vehicleType, data.id);
  return data.id;
}

async function getBrandMap(vehicleType: VehicleTypeSlug): Promise<Map<string, BrandRow>> {
  const cached = brandCache.get(vehicleType);
  if (cached) {
    return cached;
  }

  const client = getSupabaseClient();
  const vehicleTypeId = await ensureVehicleTypeId(vehicleType);

  const { data, error } = await client
    .from('fipe_brands')
    .select('id, name, name_upper, search_name, fipe_code, vehicle_type_id')
    .eq('vehicle_type_id', vehicleTypeId);

  if (error || !data) {
    throw new Error(`Não foi possível carregar marcas FIPE (${vehicleType}): ${error?.message ?? 'sem dados'}`);
  }

  const map = new Map<string, BrandRow>();
  data.forEach((row) => {
    map.set(row.search_name, row);
  });

  brandCache.set(vehicleType, map);
  brandListCache.set(vehicleType, data);
  return map;
}

async function getBrandList(vehicleType: VehicleTypeSlug): Promise<BrandRow[]> {
  const cached = brandListCache.get(vehicleType);
  if (cached) {
    return cached;
  }
  await getBrandMap(vehicleType);
  return brandListCache.get(vehicleType) ?? [];
}

function resolveBrandAlias(searchKey: string): string | undefined {
  return BRAND_ALIASES[searchKey];
}

async function findBrandRecord(value: string, vehicleType: VehicleTypeSlug): Promise<BrandRow | null> {
  const searchKey = buildSearchKey(value);
  if (!searchKey) return null;

  const map = await getBrandMap(vehicleType);

  const aliasTarget = resolveBrandAlias(searchKey);
  if (aliasTarget) {
    const aliasRecord = map.get(aliasTarget);
    if (aliasRecord) return aliasRecord;
  }

  const direct = map.get(searchKey);
  if (direct) {
    return direct;
  }

  const upperValue = toAsciiUpper(value);
  const brands = await getBrandList(vehicleType);

  for (const record of brands) {
    if (upperValue === record.name_upper) {
      return record;
    }
  }

  for (const record of brands) {
    if (searchKey.includes(record.search_name)) {
      return record;
    }
    if (record.search_name.includes(searchKey) && searchKey.length >= 3) {
      return record;
    }
  }

  return null;
}

async function getModelMap(brandId: string): Promise<Map<string, ModelRecord>> {
  const cached = modelCache.get(brandId);
  if (cached) {
    return cached;
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('fipe_models')
    .select('id, name, name_upper, base_name, base_name_upper, base_search_name, fipe_code')
    .eq('brand_id', brandId);

  if (error || !data) {
    throw new Error(`Não foi possível carregar modelos FIPE (brand_id=${brandId}): ${error?.message ?? 'sem dados'}`);
  }

  const map = new Map<string, ModelRecord>();
  data.forEach((row) => {
    const record: ModelRecord = {
      ...row,
      name_search: buildSearchKey(row.name)
    };
    map.set(record.base_search_name, record);
  });

  modelCache.set(brandId, map);
  return map;
}

async function findModelRecord(
  brandId: string,
  searchKeys: string[]
): Promise<ModelRecord | null> {
  const keys = Array.from(new Set(searchKeys.filter((key) => key && key.length > 0)));
  if (keys.length === 0) {
    return null;
  }

  const map = await getModelMap(brandId);

  for (const key of keys) {
    const direct = map.get(key);
    if (direct) {
      return direct;
    }
  }

  for (const key of keys) {
    for (const record of map.values()) {
      if (key === record.name_search) {
        return record;
      }
      if (key.length >= 3 && (key.includes(record.base_search_name) || record.base_search_name.includes(key))) {
        return record;
      }
      if (key.length >= 3 && (key.includes(record.name_search) || record.name_search.includes(key))) {
        return record;
      }
    }
  }

  return null;
}

export async function validateAndNormalizeBrand(
  brand: string,
  vehicleType: VehicleTypeSlug = 'carros'
): Promise<{ isValid: boolean; normalized: string | null; fipeBrand: LocalFipeBrand | null; brandRecord: BrandRow | null }> {
  if (!brand || typeof brand !== 'string') {
    return { isValid: false, normalized: null, fipeBrand: null, brandRecord: null };
  }

  const trimmed = brand.trim();
  if (!trimmed || isOnlyNumbers(trimmed) || isPart(trimmed) || isInvalidBrandWord(trimmed)) {
    return { isValid: false, normalized: null, fipeBrand: null, brandRecord: null };
  }

  try {
    const record = await findBrandRecord(trimmed, vehicleType);
    if (record) {
      return {
        isValid: true,
        normalized: record.name_upper,
        brandRecord: record,
        fipeBrand: {
          codigo: record.fipe_code,
          nome: record.name
        }
      };
    }
  } catch (error) {
    console.warn('[validateAndNormalizeBrand] erro ao buscar marca FIPE:', error);
  }

  const fallback = normalizeBrandName(trimmed);
  return {
    isValid: false,
    normalized: fallback.upper,
    fipeBrand: null,
    brandRecord: null
  };
}

export async function validateAndNormalizeModel(
  brand: string,
  model: string,
  vehicleType: VehicleTypeSlug = 'carros'
): Promise<{ isValid: boolean; normalized: string | null; fipeModel: LocalFipeModel | null }> {
  if (!model || typeof model !== 'string') {
    return { isValid: false, normalized: null, fipeModel: null };
  }

  const trimmed = model.trim();
  if (!trimmed || isOnlyNumbers(trimmed) || isPart(trimmed)) {
    return { isValid: false, normalized: null, fipeModel: null };
  }

  try {
    const brandLookup = await validateAndNormalizeBrand(brand, vehicleType);
    const brandRecord = brandLookup.brandRecord ?? (brandLookup.normalized ? await findBrandRecord(brandLookup.normalized, vehicleType) : null);
    if (!brandRecord) {
      return { isValid: false, normalized: toAsciiUpper(trimmed), fipeModel: null };
    }

    const base = extractModelBase(trimmed);
    const searchKeys = [
      base.baseSearchName,
      buildSearchKey(trimmed),
      buildSearchKey(base.baseNameUpper)
    ];

    const modelRecord = await findModelRecord(brandRecord.id, searchKeys);
    if (modelRecord) {
      return {
        isValid: true,
        normalized: modelRecord.base_name_upper,
        fipeModel: {
          codigo: modelRecord.fipe_code,
          nome: modelRecord.base_name
        }
      };
    }
  } catch (error) {
    console.warn('[validateAndNormalizeModel] erro ao buscar modelo FIPE:', error);
  }

  return {
    isValid: false,
    normalized: toAsciiUpper(trimmed),
    fipeModel: null
  };
}

export async function normalizeVehicleBrandModel(
  brand: string | null | undefined,
  model: string | null | undefined,
  vehicleType: VehicleTypeSlug = 'carros'
): Promise<{
  brand: string | null;
  model: string | null;
  variant?: string | null;
  isValid: boolean;
  wasSeparated: boolean;
  wasNormalized: boolean;
}> {
  let finalBrand = brand?.trim() || null;
  let finalModel = model?.trim() || null;
  let wasSeparated = false;
  let wasNormalized = false;

  if (finalBrand && !finalModel) {
    const separated = separateBrandModel(finalBrand);
    if (separated.brand && separated.model) {
      finalBrand = separated.brand;
      finalModel = separated.model;
      wasSeparated = true;
    }
  }

  if (finalBrand && finalBrand.includes('/')) {
    const separated = separateBrandModel(finalBrand);
    if (separated.brand && separated.model) {
      finalBrand = separated.brand;
      if (!finalModel) {
        finalModel = separated.model;
      }
      wasSeparated = true;
    }
  }

  let brandRecord: BrandRow | null = null;
  if (finalBrand) {
    const validation = await validateAndNormalizeBrand(finalBrand, vehicleType);
    brandRecord = validation.brandRecord ?? (validation.normalized ? await findBrandRecord(validation.normalized, vehicleType) : null);

    if (validation.normalized && validation.normalized !== finalBrand.toUpperCase()) {
      wasNormalized = true;
    }

    finalBrand = validation.normalized ?? (finalBrand ? toAsciiUpper(finalBrand) : null);
  }

  let variant: string | null = null;
  let modelRecord: ModelRecord | null = null;

  if (finalModel) {
    const base = extractModelBase(finalModel);
    variant = base.variantName || null;

    if (brandRecord) {
      const searchKeys = [
        base.baseSearchName,
        buildSearchKey(finalModel),
        buildSearchKey(base.baseNameUpper)
      ];
      modelRecord = await findModelRecord(brandRecord.id, searchKeys);
    }

    if (modelRecord) {
      if (modelRecord.base_name_upper !== toAsciiUpper(finalModel)) {
        wasNormalized = true;
      }
      finalModel = modelRecord.base_name_upper;
    } else {
      const fallback = base.baseNameUpper || toAsciiUpper(finalModel);
      if (fallback !== toAsciiUpper(finalModel)) {
        wasNormalized = true;
      }
      finalModel = fallback;
    }
  }

  const isValid = Boolean(brandRecord && modelRecord);

  return {
    brand: finalBrand,
    model: finalModel,
    variant,
    isValid,
    wasSeparated,
    wasNormalized
  };
}

export async function filterValidBrands(
  brands: string[],
  vehicleType: VehicleTypeSlug = 'carros'
): Promise<string[]> {
  const validBrands = new Set<string>();

  for (const candidate of brands) {
    if (!candidate || typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    if (isOnlyNumbers(trimmed) || isPart(trimmed) || isInvalidBrandWord(trimmed)) continue;

    const validation = await validateAndNormalizeBrand(trimmed, vehicleType);
    if (validation.normalized) {
      validBrands.add(validation.normalized);
    }
  }

  return Array.from(validBrands).sort();
}

export async function filterValidModels(
  brand: string,
  models: string[],
  vehicleType: VehicleTypeSlug = 'carros'
): Promise<string[]> {
  const validModels = new Set<string>();
  const brandRecord = await findBrandRecord(brand, vehicleType);
  if (!brandRecord) {
    return [];
  }

  for (const candidate of models) {
    if (!candidate || typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (!trimmed || isOnlyNumbers(trimmed) || isPart(trimmed)) continue;

    const base = extractModelBase(trimmed);
    const searchKeys = [
      base.baseSearchName,
      buildSearchKey(trimmed),
      buildSearchKey(base.baseNameUpper)
    ];
    const record = await findModelRecord(brandRecord.id, searchKeys);

    if (record) {
      validModels.add(record.base_name_upper);
    } else if (base.baseNameUpper) {
      validModels.add(base.baseNameUpper);
    } else {
      validModels.add(toAsciiUpper(trimmed));
    }
  }

  return Array.from(validModels).sort();
}

