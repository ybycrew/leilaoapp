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
  vehicle_type_id?: string; // Adicionar vehicle_type_id ao ModelRecord
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
    .select('id, name, name_upper, base_name, base_name_upper, base_search_name, fipe_code, vehicle_type_id')
    .eq('brand_id', brandId);

  if (error || !data) {
    throw new Error(`Não foi possível carregar modelos FIPE (brand_id=${brandId}): ${error?.message ?? 'sem dados'}`);
  }

  const map = new Map<string, ModelRecord>();
  data.forEach((row) => {
    const record: ModelRecord = {
      ...row,
      name_search: buildSearchKey(row.name),
      vehicle_type_id: row.vehicle_type_id
    };
    map.set(record.base_search_name, record);
  });

  modelCache.set(brandId, map);
  return map;
}

/**
 * PRIORIDADE 1: Lookup direto na tabela fipe_models usando base_search_name e vehicle_type_id
 * Permite encontrar o tipo diretamente pelo modelo, sem precisar passar pela marca
 * Resolve problema de marcas duais (Honda, Suzuki, Volvo)
 * 
 * Se marca fornecida, busca primeiro dentro dessa marca para evitar falsos positivos
 */
async function findModelByDirectLookup(
  model: string,
  searchKeys: string[],
  brandName?: string | null
): Promise<{ modelRecord: ModelRecord; vehicleTypeSlug: VehicleTypeSlug } | null> {
  if (!model || searchKeys.length === 0) {
    return null;
  }

  const client = getSupabaseClient();
  const keys = Array.from(new Set(searchKeys.filter((key) => key && key.length > 0)));
  
  if (keys.length === 0) {
    return null;
  }

  // Se temos marca, buscar primeiro dentro dessa marca para evitar falsos positivos
  let brandIds: string[] = [];
  if (brandName) {
    try {
      const brandSearchKey = buildSearchKey(brandName);
      if (brandSearchKey) {
        // Buscar todas as marcas com esse nome em todos os tipos
        // Primeiro tenta busca exata por search_name
        const { data: brandsExact, error: brandErrorExact } = await client
          .from('fipe_brands')
          .select('id, search_name, name_upper')
          .eq('search_name', brandSearchKey)
          .limit(10);

        if (!brandErrorExact && brandsExact && brandsExact.length > 0) {
          brandIds = brandsExact.map(b => b.id);
        } else {
          // Se não encontrou exato, tenta busca parcial por name_upper
          const brandUpper = brandName.toUpperCase();
          const { data: brandsPartial, error: brandErrorPartial } = await client
            .from('fipe_brands')
            .select('id, search_name, name_upper')
            .ilike('name_upper', `%${brandUpper}%`)
            .limit(10);

          if (!brandErrorPartial && brandsPartial && brandsPartial.length > 0) {
            brandIds = brandsPartial.map(b => b.id);
          }
        }
      }
    } catch (error) {
      // Erro ao buscar marca, continua com busca global
      console.warn(`[findModelByDirectLookup] Erro ao buscar marca ${brandName}:`, error);
    }
  }

  // Buscar modelo diretamente usando base_search_name em TODOS os tipos
  // Isso permite encontrar o tipo correto mesmo para marcas duais
  for (const key of keys) {
    try {
      // Se temos marca, buscar primeiro dentro dessa marca
      if (brandIds.length > 0) {
        // 1. Busca exata
        const { data: exactMatchInBrand, error: exactErrorInBrand } = await client
          .from('fipe_models')
          .select('id, name, name_upper, base_name, base_name_upper, base_search_name, fipe_code, vehicle_type_id, brand_id')
          .eq('base_search_name', key)
          .in('brand_id', brandIds)
          .not('vehicle_type_id', 'is', null)
          .limit(10);

        if (!exactErrorInBrand && exactMatchInBrand && exactMatchInBrand.length > 0) {
          // Encontrou dentro da marca fornecida - usar este (mais confiável)
          const modelRecord = exactMatchInBrand[0] as ModelRecord & { brand_id: string };
          const vehicleTypeSlug = await mapVehicleTypeIdToSlug(modelRecord.vehicle_type_id!);
          
          if (vehicleTypeSlug) {
            return {
              modelRecord: {
                ...modelRecord,
                name_search: buildSearchKey(modelRecord.name)
              },
              vehicleTypeSlug
            };
          }
        }

        // 2. Busca por prefixo (modelos que começam com a chave) - importante para modelos curtos como "FH"
        // Ex: "FH" deve encontrar "FH400", "FH480", "FH440", etc.
        if (key.length >= 2) {
          const { data: prefixMatchInBrand, error: prefixErrorInBrand } = await client
            .from('fipe_models')
            .select('id, name, name_upper, base_name, base_name_upper, base_search_name, fipe_code, vehicle_type_id, brand_id')
            .ilike('base_search_name', `${key}%`)
            .in('brand_id', brandIds)
            .not('vehicle_type_id', 'is', null)
            .limit(10);

          if (!prefixErrorInBrand && prefixMatchInBrand && prefixMatchInBrand.length > 0) {
            // Priorizar matches mais específicos (mais longos) primeiro
            prefixMatchInBrand.sort((a: any, b: any) => {
              const aLen = a.base_search_name?.length || 0;
              const bLen = b.base_search_name?.length || 0;
              return bLen - aLen; // Mais longo primeiro
            });

            const modelRecord = prefixMatchInBrand[0] as ModelRecord & { brand_id: string };
            const vehicleTypeSlug = await mapVehicleTypeIdToSlug(modelRecord.vehicle_type_id!);
            
            if (vehicleTypeSlug) {
              return {
                modelRecord: {
                  ...modelRecord,
                  name_search: buildSearchKey(modelRecord.name)
                },
                vehicleTypeSlug
              };
            }
          }
        }
      }

      // Busca exata por base_search_name (busca global se não encontrou na marca)
      // MAS: se temos marca mas não encontramos na busca dentro da marca, NÃO fazer busca global
      let exactMatch: any[] = [];
      let exactError: any = null;

      if (brandIds.length === 0 || !brandName) {
        // Sem marca ou marca não encontrada - fazer busca global
        const result = await client
          .from('fipe_models')
          .select('id, name, name_upper, base_name, base_name_upper, base_search_name, fipe_code, vehicle_type_id, brand_id')
          .eq('base_search_name', key)
          .not('vehicle_type_id', 'is', null)
          .limit(10);
        
        exactMatch = result.data || [];
        exactError = result.error;
      }

      // Se não encontrou exato e temos chave curta (>= 2), tentar busca por prefixo global
      if ((!exactMatch || exactMatch.length === 0) && key.length >= 2 && (!brandName || brandIds.length === 0)) {
        const { data: prefixMatch, error: prefixError } = await client
          .from('fipe_models')
          .select('id, name, name_upper, base_name, base_name_upper, base_search_name, fipe_code, vehicle_type_id, brand_id')
          .ilike('base_search_name', `${key}%`)
          .not('vehicle_type_id', 'is', null)
          .limit(10);

        if (!prefixError && prefixMatch && prefixMatch.length > 0) {
          // Priorizar matches mais específicos (mais longos) primeiro
          prefixMatch.sort((a: any, b: any) => {
            const aLen = a.base_search_name?.length || 0;
            const bLen = b.base_search_name?.length || 0;
            return bLen - aLen; // Mais longo primeiro
          });

          exactMatch = prefixMatch;
        }
      }

        if (!exactError && exactMatch && exactMatch.length > 0) {
        // Se temos marca, validar que o modelo encontrado pertence a uma marca compatível
        if (brandIds.length > 0) {
          const matchingInBrand = exactMatch.find((m: any) => brandIds.includes(m.brand_id));
          if (matchingInBrand) {
            // Encontrou modelo na marca correta
            const modelRecord = matchingInBrand as ModelRecord & { brand_id: string };
            const vehicleTypeSlug = await mapVehicleTypeIdToSlug(modelRecord.vehicle_type_id!);
            
            if (vehicleTypeSlug) {
              return {
                modelRecord: {
                  ...modelRecord,
                  name_search: buildSearchKey(modelRecord.name)
                },
                vehicleTypeSlug
              };
            }
          } else {
            // Modelo encontrado mas não pertence à marca fornecida - pular esta chave
            // Não retornar falso positivo
            continue;
          }
        } else {
          // Sem marca fornecida, usar o primeiro match
          // MAS: se temos marca fornecida mas não encontramos na busca dentro da marca,
          // NÃO retornar resultado da busca global (pode ser de outra marca)
          if (brandIds.length > 0) {
            // Temos marca mas não encontramos na busca dentro da marca
            // Não retornar falso positivo da busca global
            continue;
          }
          
          const modelRecord = exactMatch[0] as ModelRecord & { brand_id: string };
          const vehicleTypeSlug = await mapVehicleTypeIdToSlug(modelRecord.vehicle_type_id!);
          
          if (vehicleTypeSlug) {
            return {
              modelRecord: {
                ...modelRecord,
                name_search: buildSearchKey(modelRecord.name)
              },
              vehicleTypeSlug
            };
          }
        }
      }

      // Busca parcial por base_search_name (contém a chave)
      // Para modelos curtos (2+ caracteres), também fazer busca parcial
      // Mas priorizar matches que começam com a chave (já feito acima)
      if (key.length >= 2) {
        // Se temos marca, buscar primeiro dentro dessa marca
        if (brandIds.length > 0) {
          // Busca parcial (contém) - apenas se não encontrou por prefixo acima
          const { data: partialMatchInBrand, error: partialErrorInBrand } = await client
            .from('fipe_models')
            .select('id, name, name_upper, base_name, base_name_upper, base_search_name, fipe_code, vehicle_type_id, brand_id')
            .ilike('base_search_name', `%${key}%`)
            .in('brand_id', brandIds)
            .not('vehicle_type_id', 'is', null)
            .limit(10);

          if (!partialErrorInBrand && partialMatchInBrand && partialMatchInBrand.length > 0) {
            // Filtrar matches mais relevantes
            // Priorizar matches que começam com a chave
            const keyLower = key.toLowerCase();
            const relevantMatches = partialMatchInBrand
              .filter((m: any) => {
                const baseSearch = m.base_search_name?.toLowerCase() || '';
                return baseSearch.includes(keyLower) || keyLower.includes(baseSearch);
              })
              .sort((a: any, b: any) => {
                const aSearch = a.base_search_name?.toLowerCase() || '';
                const bSearch = b.base_search_name?.toLowerCase() || '';
                
                // Priorizar matches que começam com a chave
                const aStarts = aSearch.startsWith(keyLower);
                const bStarts = bSearch.startsWith(keyLower);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                
                // Depois priorizar matches mais longos (mais específicos)
                return bSearch.length - aSearch.length;
              });

            if (relevantMatches.length > 0) {
              const modelRecord = relevantMatches[0] as ModelRecord & { brand_id: string };
              const vehicleTypeSlug = await mapVehicleTypeIdToSlug(modelRecord.vehicle_type_id!);
              
              if (vehicleTypeSlug) {
                return {
                  modelRecord: {
                    ...modelRecord,
                    name_search: buildSearchKey(modelRecord.name)
                  },
                  vehicleTypeSlug
                };
              }
            }
          }
        }

        // Busca parcial global (apenas se não temos marca ou se temos marca mas não encontramos na busca dentro da marca)
        // MAS: se temos marca mas não encontramos no banco (brandIds vazio), NÃO fazer busca global
        if (brandName && brandIds.length === 0) {
          // Temos marca mas não encontramos no banco - não fazer busca global (pode retornar modelo errado)
          continue;
        }

        const { data: partialMatch, error: partialError } = await client
          .from('fipe_models')
          .select('id, name, name_upper, base_name, base_name_upper, base_search_name, fipe_code, vehicle_type_id, brand_id')
          .ilike('base_search_name', `%${key}%`)
          .not('vehicle_type_id', 'is', null)
          .limit(10);

        if (!partialError && partialMatch && partialMatch.length > 0) {
          // Filtrar matches mais relevantes
          // Priorizar matches que começam com a chave ou são palavras completas
          const keyLower = key.toLowerCase();
          let relevantMatches = partialMatch.filter((m: any) => {
            const baseSearch = m.base_search_name?.toLowerCase() || '';
            const baseName = m.base_name_upper?.toLowerCase() || '';
            
            // Match exato
            if (baseSearch === keyLower) return true;
            
            // Começa com a chave (ex: "TITAN150" começa com "TITAN")
            if (baseSearch.startsWith(keyLower)) return true;
            
            // A chave começa com o baseSearch (ex: "TITAN150" começa com "TITAN")
            if (keyLower.startsWith(baseSearch) && baseSearch.length >= 3) return true;
            
            // Palavra completa presente (evita "TITAN" em "PARATITAN")
            // Verificar se a chave aparece como palavra completa no nome
            const words = baseName.split(/\s+/);
            if (words.some(word => word === keyLower || word.startsWith(keyLower))) return true;
            
            // Se a chave é muito curta (< 3 chars), ser mais restritivo
            if (keyLower.length < 3) {
              // Apenas se for match exato ou começar com a chave
              return baseSearch === keyLower || baseSearch.startsWith(keyLower);
            }
            
            // Para chaves maiores, aceitar se contém (mas priorizar outros)
            return baseSearch.includes(keyLower) || keyLower.includes(baseSearch);
          });

          // Ordenar por relevância: exato > começa com > contém
          relevantMatches.sort((a: any, b: any) => {
            const aSearch = a.base_search_name?.toLowerCase() || '';
            const bSearch = b.base_search_name?.toLowerCase() || '';
            
            const aExact = aSearch === keyLower;
            const bExact = bSearch === keyLower;
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            
            const aStarts = aSearch.startsWith(keyLower);
            const bStarts = bSearch.startsWith(keyLower);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            
            return 0;
          });

          // Se temos marca, APENAS retornar matches da marca correta
          if (brandIds.length > 0 && relevantMatches.length > 0) {
            const matchingInBrand = relevantMatches.find((m: any) => brandIds.includes(m.brand_id));
            if (matchingInBrand) {
              relevantMatches = [matchingInBrand];
            } else {
              // Não encontrou na marca correta - NÃO retornar falso positivo
              // Continuar para próxima chave ou próxima prioridade
              continue;
            }
          }

          if (relevantMatches.length > 0) {
            const modelRecord = relevantMatches[0] as ModelRecord & { brand_id: string };
            const vehicleTypeSlug = await mapVehicleTypeIdToSlug(modelRecord.vehicle_type_id!);
            
            if (vehicleTypeSlug) {
              return {
                modelRecord: {
                  ...modelRecord,
                  name_search: buildSearchKey(modelRecord.name)
                },
                vehicleTypeSlug
              };
            }
          }
        }
      }
    } catch (error) {
      // Erro na busca, continua para próxima chave
      continue;
    }
  }

  return null;
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

/**
 * Interface para resultado da busca de tipo na FIPE
 */
export interface FindVehicleTypeResult {
  type: VehicleTypeSlug | null;
  normalizedBrand: string | null;
  normalizedModel: string | null;
  isValid: boolean;
}

/**
 * Mapeia tipo FIPE para valor da tabela vehicles
 */
export function mapFipeTypeToVehicleType(fipeType: VehicleTypeSlug): string {
  switch (fipeType) {
    case 'carros':
      return 'carro';
    case 'motos':
      return 'moto';
    case 'caminhoes':
      return 'caminhao';
    default:
      return 'carro';
  }
}

/**
 * Mapeia vehicle_type_id para VehicleTypeSlug
 * IDs conhecidos:
 * - 924b2730-9671-48fb-9e20-a007cc9dd8d9 - carros
 * - ba5c8969-a7df-4fbe-829e-12eac17b20cd - motos
 * - ad355400-7d4b-49e5-913d-d6575cf93705 - caminhoes
 */
const VEHICLE_TYPE_ID_MAP: Record<string, VehicleTypeSlug> = {
  '924b2730-9671-48fb-9e20-a007cc9dd8d9': 'carros',
  'ba5c8969-a7df-4fbe-829e-12eac17b20cd': 'motos',
  'ad355400-7d4b-49e5-913d-d6575cf93705': 'caminhoes',
};

async function mapVehicleTypeIdToSlug(vehicleTypeId: string): Promise<VehicleTypeSlug | null> {
  // Primeiro tenta usar o mapa de IDs conhecidos
  const mapped = VEHICLE_TYPE_ID_MAP[vehicleTypeId];
  if (mapped) {
    return mapped;
  }

  // Se não encontrar no mapa, busca na tabela fipe_vehicle_types
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('fipe_vehicle_types')
      .select('slug')
      .eq('id', vehicleTypeId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.slug as VehicleTypeSlug;
  } catch (error) {
    return null;
  }
}

/**
 * Busca todas as marcas com o nome fornecido em TODOS os tipos de veículo
 * Retorna array de BrandRow encontradas (pode haver múltiplas se a marca existe em vários tipos)
 */
async function findAllBrandsByName(brandName: string): Promise<BrandRow[]> {
  if (!brandName || typeof brandName !== 'string') {
    return [];
  }

  const trimmedBrand = brandName.trim();
  if (!trimmedBrand) {
    return [];
  }

  const searchKey = buildSearchKey(trimmedBrand);
  if (!searchKey) {
    return [];
  }

  const client = getSupabaseClient();

  // Buscar todas as marcas com esse nome em TODOS os tipos (sem filtrar por vehicle_type_id)
  // Primeiro tenta busca exata por search_name
  let { data, error } = await client
    .from('fipe_brands')
    .select('id, name, name_upper, search_name, fipe_code, vehicle_type_id')
    .eq('search_name', searchKey);

  // Se não encontrou, tenta busca por name_upper
  if ((!data || data.length === 0) && !error) {
    const upperBrand = toAsciiUpper(trimmedBrand);
    const { data: upperData, error: upperError } = await client
      .from('fipe_brands')
      .select('id, name, name_upper, search_name, fipe_code, vehicle_type_id')
      .eq('name_upper', upperBrand);
    
    if (!upperError && upperData) {
      data = upperData;
      error = upperError;
    }
  }

  // Se ainda não encontrou, tenta busca parcial por name_upper
  if ((!data || data.length === 0) && !error) {
    const upperBrand = toAsciiUpper(trimmedBrand);
    const { data: partialData, error: partialError } = await client
      .from('fipe_brands')
      .select('id, name, name_upper, search_name, fipe_code, vehicle_type_id')
      .ilike('name_upper', `%${upperBrand}%`);
    
    if (!partialError && partialData) {
      data = partialData;
      error = partialError;
    }
  }

  if (error || !data || data.length === 0) {
    return [];
  }

  // Filtrar marcas que realmente correspondem ao nome buscado
  const upperBrand = toAsciiUpper(trimmedBrand);
  const matchingBrands: BrandRow[] = [];

  for (const row of data) {
    // Busca exata por search_name
    if (row.search_name === searchKey) {
      matchingBrands.push(row);
      continue;
    }

    // Busca exata por name_upper
    if (row.name_upper === upperBrand) {
      matchingBrands.push(row);
      continue;
    }

    // Busca parcial - search_name contém ou é contido pelo searchKey
    if (searchKey.length >= 3) {
      if (row.search_name.includes(searchKey) || searchKey.includes(row.search_name)) {
        matchingBrands.push(row);
        continue;
      }
    }

    // Busca parcial - name_upper contém o nome buscado
    if (upperBrand.length >= 3 && row.name_upper.includes(upperBrand)) {
      matchingBrands.push(row);
      continue;
    }
  }

  // Remover duplicatas (mesma marca em tipos diferentes)
  const uniqueBrands = new Map<string, BrandRow>();
  for (const brand of matchingBrands) {
    const key = `${brand.search_name}-${brand.vehicle_type_id}`;
    if (!uniqueBrands.has(key)) {
      uniqueBrands.set(key, brand);
    }
  }

  let finalBrands = Array.from(uniqueBrands.values());

  // Se não encontrou nada exato, tenta com alias
  const aliasTarget = resolveBrandAlias(searchKey);
  if (aliasTarget && finalBrands.length === 0) {
    const { data: aliasData, error: aliasError } = await client
      .from('fipe_brands')
      .select('id, name, name_upper, search_name, fipe_code, vehicle_type_id')
      .ilike('search_name', `%${aliasTarget}%`);

    if (!aliasError && aliasData) {
      finalBrands = aliasData;
    }
  }

  return finalBrands;
}

/**
 * Busca tipo de veículo usando lookup direto na tabela fipe_models (PRIORIDADE 1)
 * Nova estratégia otimizada:
 * 1. PRIORIDADE 1: Lookup direto na tabela fipe_models usando base_search_name + vehicle_type_id
 * 2. PRIORIDADE 2: Lookup por marca + validação de modelo conhecido
 * 3. PRIORIDADE 3: Fallback usando vehicle_type_id da marca
 * 
 * Resolve problema de marcas duais (Honda, Suzuki, Volvo) que fabricam carros e motos
 */
export async function findVehicleTypeInFipe(
  brand: string | null,
  model: string | null
): Promise<FindVehicleTypeResult> {
  // Se não tem marca nem modelo, não pode determinar
  if (!brand && !model) {
    return {
      type: null,
      normalizedBrand: null,
      normalizedModel: null,
      isValid: false,
    };
  }

  const trimmedBrand = brand?.trim() || null;
  const trimmedModel = model?.trim() || null;

  try {
    // ============================================
    // PRIORIDADE 1: Lookup direto por modelo (mais confiável)
    // ============================================
    if (trimmedModel) {
      const modelBase = extractModelBase(trimmedModel);
      const modelSearchKeys = [
        modelBase.baseSearchName,
        buildSearchKey(trimmedModel),
        buildSearchKey(modelBase.baseNameUpper)
      ];

      const directLookup = await findModelByDirectLookup(trimmedModel, modelSearchKeys, trimmedBrand);
      
      if (directLookup) {
        // Encontrou modelo diretamente! Agora buscar a marca correspondente
        const { modelRecord, vehicleTypeSlug } = directLookup;
        const modelRecordWithBrand = modelRecord as ModelRecord & { brand_id?: string };
        
        // Buscar marca usando brand_id do modelo encontrado
        if (modelRecordWithBrand.brand_id) {
          const client = getSupabaseClient();
          const { data: brandData, error: brandError } = await client
            .from('fipe_brands')
            .select('id, name, name_upper, search_name, vehicle_type_id')
            .eq('id', modelRecordWithBrand.brand_id)
            .maybeSingle();

          if (!brandError && brandData) {
            // Se temos marca fornecida, validar que corresponde à marca do modelo encontrado
            if (trimmedBrand) {
              const brandSearchKey = buildSearchKey(trimmedBrand);
              const foundBrandSearchKey = buildSearchKey(brandData.name_upper);
              
              // Validar que a marca encontrada corresponde à marca fornecida
              if (brandSearchKey && foundBrandSearchKey && 
                  brandSearchKey !== foundBrandSearchKey &&
                  !brandData.name_upper.toUpperCase().includes(trimmedBrand.toUpperCase()) &&
                  !trimmedBrand.toUpperCase().includes(brandData.name_upper.toUpperCase())) {
                // Marca não corresponde - não retornar falso positivo
                // Continuar para próxima prioridade
              } else {
                // Marca corresponde ou não temos marca para validar
                return {
                  type: vehicleTypeSlug,
                  normalizedBrand: brandData.name_upper,
                  normalizedModel: modelRecord.base_name_upper || toAsciiUpper(trimmedModel),
                  isValid: true,
                };
              }
            } else {
              // Sem marca fornecida, usar a marca do modelo encontrado
              return {
                type: vehicleTypeSlug,
                normalizedBrand: brandData.name_upper,
                normalizedModel: modelRecord.base_name_upper || toAsciiUpper(trimmedModel),
                isValid: true,
              };
            }
          }
        }

        // Se não encontrou marca no banco, mas tem brand fornecido, validar antes de usar
        if (trimmedBrand) {
          // Validar que o modelo realmente pertence à marca fornecida
          // Se chegou aqui, o findModelByDirectLookup já validou a marca (se fornecida)
          // Então podemos confiar no resultado
          const brandValidation = await validateAndNormalizeBrand(trimmedBrand, vehicleTypeSlug);
          return {
            type: vehicleTypeSlug,
            normalizedBrand: brandValidation.normalized || toAsciiUpper(trimmedBrand),
            normalizedModel: modelRecord.base_name_upper || toAsciiUpper(trimmedModel),
            isValid: true,
          };
        }

        // Sem marca, mas temos o tipo do modelo
        return {
          type: vehicleTypeSlug,
          normalizedBrand: null,
          normalizedModel: modelRecord.base_name_upper || toAsciiUpper(trimmedModel),
          isValid: true,
        };
      }
    }

    // ============================================
    // PRIORIDADE 2: Lookup por marca (fallback se modelo não encontrado)
    // ============================================
    if (!trimmedBrand) {
      // Sem marca e modelo não encontrado, não pode determinar
      return {
        type: null,
        normalizedBrand: null,
        normalizedModel: trimmedModel ? toAsciiUpper(trimmedModel) : null,
        isValid: false,
      };
    }

    // Buscar TODAS as marcas com esse nome em TODOS os tipos
    const allBrands = await findAllBrandsByName(trimmedBrand);

    if (allBrands.length === 0) {
      // Marca não encontrada em nenhum tipo
      return {
        type: null,
        normalizedBrand: null,
        normalizedModel: null,
        isValid: false,
      };
    }

    // Se encontrou apenas uma marca, usar tipo da marca
    if (allBrands.length === 1) {
      const brandRecord = allBrands[0];
      const vehicleTypeSlugFromBrand = await mapVehicleTypeIdToSlug(brandRecord.vehicle_type_id);

      if (!vehicleTypeSlugFromBrand) {
        return {
          type: null,
          normalizedBrand: brandRecord.name_upper,
          normalizedModel: trimmedModel ? toAsciiUpper(trimmedModel) : null,
          isValid: false,
        };
      }

      // Se tem modelo, tentar validar no tipo da marca
      if (trimmedModel) {
        try {
          // Primeiro, buscar o modelo diretamente para obter seu vehicle_type_id
          const modelBase = extractModelBase(trimmedModel);
          const modelSearchKeys = [
            modelBase.baseSearchName,
            buildSearchKey(trimmedModel),
            buildSearchKey(modelBase.baseNameUpper)
          ];
          
          const modelRecord = await findModelRecord(brandRecord.id, modelSearchKeys);
          
          if (modelRecord && modelRecord.vehicle_type_id) {
            // Modelo encontrado! Usar o tipo do modelo, não da marca
            const modelVehicleTypeSlug = await mapVehicleTypeIdToSlug(modelRecord.vehicle_type_id);
            
            if (modelVehicleTypeSlug) {
              return {
                type: modelVehicleTypeSlug,
                normalizedBrand: brandRecord.name_upper,
                normalizedModel: modelRecord.base_name_upper || toAsciiUpper(trimmedModel),
                isValid: true,
              };
            }
          }
          
          // Se não encontrou modelo, tentar validar no tipo da marca (fallback)
          const modelValidation = await validateAndNormalizeModel(
            brandRecord.name_upper,
            trimmedModel,
            vehicleTypeSlugFromBrand
          );

          const normalizedModel = modelValidation.isValid && modelValidation.normalized
            ? modelValidation.normalized
            : toAsciiUpper(trimmedModel);

          return {
            type: vehicleTypeSlugFromBrand,
            normalizedBrand: brandRecord.name_upper,
            normalizedModel,
            isValid: true,
          };
        } catch (error) {
          // Erro ao validar modelo, usar marca como fallback
          return {
            type: vehicleTypeSlugFromBrand,
            normalizedBrand: brandRecord.name_upper,
            normalizedModel: toAsciiUpper(trimmedModel),
            isValid: true,
          };
        }
      }

      // Sem modelo, usar tipo da marca como fallback
      return {
        type: vehicleTypeSlugFromBrand,
        normalizedBrand: brandRecord.name_upper,
        normalizedModel: null,
        isValid: true,
      };
    }

    // 3. Se encontrou múltiplas marcas (ex: Honda em carros e motos), usar modelo para determinar
    if (!model) {
      // Sem modelo, não pode determinar qual tipo usar
      // Retorna a primeira marca encontrada como fallback
      const brandRecord = allBrands[0];
      const vehicleTypeSlug = await mapVehicleTypeIdToSlug(brandRecord.vehicle_type_id);

      return {
        type: vehicleTypeSlug,
        normalizedBrand: brandRecord.name_upper,
        normalizedModel: null,
        isValid: vehicleTypeSlug !== null,
      };
    }

    // trimmedModel já foi declarado no início da função
    if (!trimmedModel) {
      // Modelo vazio, usa primeira marca como fallback
      const brandRecord = allBrands[0];
      const vehicleTypeSlug = await mapVehicleTypeIdToSlug(brandRecord.vehicle_type_id);

      return {
        type: vehicleTypeSlug,
        normalizedBrand: brandRecord.name_upper,
        normalizedModel: null,
        isValid: vehicleTypeSlug !== null,
      };
    }

    // 4. Buscar modelo em cada marca encontrada para determinar qual é o correto
    const modelBase = extractModelBase(trimmedModel);
    const modelSearchKeys = [
      modelBase.baseSearchName,
      buildSearchKey(trimmedModel),
      buildSearchKey(modelBase.baseNameUpper)
    ];

    for (const brandRecord of allBrands) {
      try {
        // Buscar modelo nesta marca
        const modelRecord = await findModelRecord(brandRecord.id, modelSearchKeys);

        if (modelRecord) {
          // Encontrou modelo nesta marca
          // IMPORTANTE: usar vehicle_type_id do MODELO, não da marca
          // Isso garante que se a marca existe em múltiplos tipos (ex: Chevrolet em carros e caminhões),
          // retornamos o tipo correto do modelo encontrado (ex: S10 é carro, não caminhão)
          const modelVehicleTypeId = modelRecord.vehicle_type_id || brandRecord.vehicle_type_id;
          const vehicleTypeSlug = await mapVehicleTypeIdToSlug(modelVehicleTypeId);

          if (vehicleTypeSlug) {
            return {
              type: vehicleTypeSlug,
              normalizedBrand: brandRecord.name_upper,
              normalizedModel: modelRecord.base_name_upper,
              isValid: true,
            };
          }
        }
      } catch (error) {
        // Erro ao buscar modelo nesta marca, continua para próxima
        continue;
      }
    }

    // 5. Modelo não encontrado em nenhuma das marcas
    // Usa primeira marca como fallback
    const brandRecord = allBrands[0];
    const vehicleTypeSlug = await mapVehicleTypeIdToSlug(brandRecord.vehicle_type_id);

    return {
      type: vehicleTypeSlug,
      normalizedBrand: brandRecord.name_upper,
      normalizedModel: modelBase.baseNameUpper || toAsciiUpper(trimmedModel),
      isValid: vehicleTypeSlug !== null,
    };

  } catch (error) {
    // Erro na busca
    return {
      type: null,
      normalizedBrand: null,
      normalizedModel: null,
      isValid: false,
    };
  }
}

