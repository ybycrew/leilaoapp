/**
 * Serviço de normalização de marcas e modelos de veículos
 * Valida e normaliza dados usando API FIPE como fonte de verdade
 */

import {
  findFipeBrandByName,
  findFipeModelByName,
  getAllFipeBrands,
  getFipeModelsByBrand,
  type FipeBrand,
  type FipeModel
} from './fipe';

// Mapeamento de aliases conhecidos para marcas oficiais
const BRAND_ALIAS_MAP: Record<string, string> = {
  'citroen': 'Citroën',
  'citroën': 'Citroën',
  'citroem': 'Citroën',
  'gm': 'Chevrolet',
  'general motors': 'Chevrolet',
  'chevy': 'Chevrolet',
  'volkswagen': 'Volkswagen',
  'vw': 'Volkswagen',
  'mercedes benz': 'Mercedes-Benz',
  'mercedes-benz': 'Mercedes-Benz',
  'mercedesbenz': 'Mercedes-Benz',
  'mercedez': 'Mercedes-Benz',
  'mercedez-benz': 'Mercedes-Benz',
};

// Marcas que devem ser descartadas (valores genéricos ou inválidos)
const BANNED_BRAND_NAMES = new Set([
  'cross lander',
  'crosslander',
  'conservado',
  'conservada',
  'conservados',
  'conservadas',
  'desconhecido',
  'desconhecida',
  'desconhecidos',
  'desconhecidas',
  'não informado',
  'nao informado',
  'não-informado',
  'nao-informado',
  'naoinformado',
  'importado',
  'importados',
  'diverso',
  'diversos',
  'diversa',
  'diversas',
]);

const VALID_STATE_CODES = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]);

const STATE_NAME_TO_UF: Record<string, string> = {
  'ACRE': 'AC',
  'ALAGOAS': 'AL',
  'AMAPA': 'AP',
  'AMAPÁ': 'AP',
  'AMAZONAS': 'AM',
  'BAHIA': 'BA',
  'CEARA': 'CE',
  'CEARÁ': 'CE',
  'DISTRITO FEDERAL': 'DF',
  'FEDERAL DISTRICT': 'DF',
  'ESPIRITO SANTO': 'ES',
  'ESPÍRITO SANTO': 'ES',
  'GOIAS': 'GO',
  'GOIÁS': 'GO',
  'MARANHAO': 'MA',
  'MARANHÃO': 'MA',
  'MATO GROSSO': 'MT',
  'MATO GROSSO DO SUL': 'MS',
  'MINAS GERAIS': 'MG',
  'PARA': 'PA',
  'PARÁ': 'PA',
  'PARAIBA': 'PB',
  'PARAÍBA': 'PB',
  'PARANA': 'PR',
  'PARANÁ': 'PR',
  'PERNAMBUCO': 'PE',
  'PIAUI': 'PI',
  'PIAUÍ': 'PI',
  'RIO DE JANEIRO': 'RJ',
  'RIO GRANDE DO NORTE': 'RN',
  'RIO GRANDE DO SUL': 'RS',
  'RONDONIA': 'RO',
  'RONDÔNIA': 'RO',
  'RORAIMA': 'RR',
  'SANTA CATARINA': 'SC',
  'SAO PAULO': 'SP',
  'SÃO PAULO': 'SP',
  'SERGIPE': 'SE',
  'TOCANTINS': 'TO',
};

const CITY_LOWERCASE_WORDS = new Set([
  'da', 'das', 'de', 'do', 'dos', 'del', 'della', 'di', 'd', 'e', 'na', 'nas', 'no', 'nos'
]);

function removeDiacritics(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function capitalizeCitySegment(segment: string): string {
  if (!segment) {
    return segment;
  }
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

function capitalizeCityWord(word: string, index: number): string {
  const lower = word.toLowerCase();

  if (lower.startsWith("d'") && index !== 0) {
    const remainder = lower.slice(2);
    const capitalized = capitalizeCityWord(remainder, 0);
    return `d'${capitalized}`;
  }

  if (CITY_LOWERCASE_WORDS.has(lower) && index !== 0) {
    return lower;
  }

  return lower
    .split('-')
    .map(part => part
      .split("'")
      .map(sub => capitalizeCitySegment(sub))
      .join("'"))
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

function formatCityName(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => capitalizeCityWord(word, index))
    .join(' ');
}

function splitCityAndState(rawCity: string | null | undefined): { city: string | null; stateCandidate: string | null } {
  if (!rawCity || typeof rawCity !== 'string') {
    return { city: null, stateCandidate: null };
  }

  let text = rawCity.trim();
  if (!text) {
    return { city: null, stateCandidate: null };
  }

  text = text.replace(/\s{2,}/g, ' ');
  text = text.replace(/,?\s*brasil$/i, '').trim();

  let stateCandidate: string | null = null;
  const patterns = [
    /[\/|\-]\s*([A-Za-z]{2})$/i,
    /\(([A-Za-z]{2})\)$/i,
    /,\s*([A-Za-z]{2})$/i,
    /\s([A-Za-z]{2})$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].toUpperCase();
      if (VALID_STATE_CODES.has(candidate)) {
        stateCandidate = candidate;
        text = text.replace(pattern, '').trim();
        break;
      }
    }
  }

  text = text.replace(/^(cidade|município|municipio)\s+de\s+/i, '');
  text = text.replace(/^(de|da|das|do|dos)\s+/i, '');

  const city = text.length ? text : null;

  return {
    city,
    stateCandidate,
  };
}

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
 * Verifica se a marca está em uma lista proibida
 */
export function isBannedBrandName(value: string): boolean {
  const valueLower = value.toLowerCase().trim();
  return BANNED_BRAND_NAMES.has(valueLower);
}

/**
 * Normaliza uma sigla de estado brasileiro
 */
export function normalizeState(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const upper = trimmed.toUpperCase();
  const onlyLetters = upper.replace(/[^A-Z]/g, '');

  if (onlyLetters.length === 2 && VALID_STATE_CODES.has(onlyLetters)) {
    return onlyLetters;
  }

  const sanitized = removeDiacritics(upper).replace(/[^A-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();

  if (!sanitized) {
    return null;
  }

  if (STATE_NAME_TO_UF[sanitized]) {
    return STATE_NAME_TO_UF[sanitized];
  }

  const twoLetterMatch = sanitized.match(/([A-Z]{2})$/);
  if (twoLetterMatch && VALID_STATE_CODES.has(twoLetterMatch[1])) {
    return twoLetterMatch[1];
  }

  return null;
}

/**
 * Verifica se um estado é válido
 */
export function isValidState(value: string | null | undefined): boolean {
  const normalized = normalizeState(value);
  return Boolean(normalized);
}

/**
 * Normaliza nome de cidade, removendo sufixos de estado
 */
export function normalizeCityName(city: string | null | undefined): string | null {
  const { city: rawCity } = splitCityAndState(city);
  if (!rawCity) {
    return null;
  }

  return formatCityName(rawCity);
}

/**
 * Normaliza estado e cidade simultaneamente, tentando extrair UF do campo da cidade quando necessário
 */
export function normalizeStateCity(
  stateInput: string | null | undefined,
  cityInput: string | null | undefined
): { state: string | null; city: string | null } {
  let normalizedState = normalizeState(stateInput);
  let normalizedCity: string | null = null;

  if (cityInput) {
    const { city, stateCandidate } = splitCityAndState(cityInput);
    if (city) {
      normalizedCity = formatCityName(city);
    }

    if (!normalizedState && stateCandidate) {
      normalizedState = normalizeState(stateCandidate);
    }
  }

  return {
    state: normalizedState,
    city: normalizedCity,
  };
}

/**
 * Aplica aliases conhecidos para marcas
 */
function applyBrandAlias(value: string): string {
  const valueLower = value.toLowerCase().trim();
  if (BRAND_ALIAS_MAP[valueLower]) {
    return BRAND_ALIAS_MAP[valueLower];
  }
  return value;
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

/**
 * Normaliza nome de marca (CHEVROLET -> Chevrolet, FIAT -> Fiat)
 */
export function normalizeBrandName(brand: string): string {
  if (!brand || typeof brand !== 'string') return brand;
  
  const trimmed = brand.trim();

  // Aplicar alias conhecido antes de normalizar casing
  const aliasApplied = applyBrandAlias(trimmed);
  if (aliasApplied !== trimmed) {
    return aliasApplied;
  }
  
  // Se já está normalizado (primeira letra maiúscula, resto minúscula), retorna
  if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(trimmed)) {
    return trimmed;
  }
  
  // Se está tudo em maiúscula, normaliza
  if (/^[A-Z\s]+$/.test(trimmed)) {
    return trimmed
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  // Se está tudo em minúscula, normaliza
  if (/^[a-z\s]+$/.test(trimmed)) {
    return trimmed
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  // Caso misto, tenta normalizar palavra por palavra
  return trimmed
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      if (word.length === 1) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

const isFipeLookupEnabled = () => process.env.SCRAPER_ENABLE_FIPE_LOOKUP === 'true';

/**
 * Valida e normaliza marca usando API FIPE
 */
export async function validateAndNormalizeBrand(
  brand: string,
  vehicleType: 'carros' | 'motos' | 'caminhoes' = 'carros'
): Promise<{ isValid: boolean; normalized: string | null; fipeBrand: FipeBrand | null }> {
  if (!brand || typeof brand !== 'string') {
    return { isValid: false, normalized: null, fipeBrand: null };
  }

  const trimmed = brand.trim();

  // Verificar se é apenas números
  if (isOnlyNumbers(trimmed)) {
    return { isValid: false, normalized: null, fipeBrand: null };
  }

  // Verificar se é uma peça
  if (isPart(trimmed)) {
    return { isValid: false, normalized: null, fipeBrand: null };
  }

  // Verificar se é palavra inválida
  if (isInvalidBrandWord(trimmed)) {
    return { isValid: false, normalized: null, fipeBrand: null };
  }

  // Verificar se é marca proibida
  if (isBannedBrandName(trimmed)) {
    return { isValid: false, normalized: null, fipeBrand: null };
  }

  // Aplicar alias, se houver
  const aliasApplied = applyBrandAlias(trimmed);
  const candidateForFipe = aliasApplied;

  if (!isFipeLookupEnabled()) {
    return {
      isValid: true,
      normalized: normalizeBrandName(aliasApplied),
      fipeBrand: null,
    };
  }

  // Tentar encontrar na FIPE
  const fipeBrand = await findFipeBrandByName(candidateForFipe, vehicleType);

  if (fipeBrand) {
    return {
      isValid: true,
      normalized: fipeBrand.nome,
      fipeBrand
    };
  }

  // Se não encontrou na FIPE, retorna normalizado mas inválido
  return {
    isValid: false,
    normalized: normalizeBrandName(aliasApplied),
    fipeBrand: null
  };
}

/**
 * Valida e normaliza modelo usando API FIPE
 */
export async function validateAndNormalizeModel(
  brand: string,
  model: string,
  vehicleType: 'carros' | 'motos' | 'caminhoes' = 'carros'
): Promise<{ isValid: boolean; normalized: string | null; fipeModel: FipeModel | null }> {
  if (!model || typeof model !== 'string') {
    return { isValid: false, normalized: null, fipeModel: null };
  }

  const trimmed = model.trim();
  
  // Verificar se é apenas números
  if (isOnlyNumbers(trimmed)) {
    return { isValid: false, normalized: null, fipeModel: null };
  }
  
  // Verificar se é uma peça
  if (isPart(trimmed)) {
    return { isValid: false, normalized: null, fipeModel: null };
  }
  
  if (!isFipeLookupEnabled()) {
    return {
      isValid: true,
      normalized: trimmed,
      fipeModel: null,
    };
  }

  // Buscar marca na FIPE primeiro
  const fipeBrand = await findFipeBrandByName(brand, vehicleType);
  
  if (!fipeBrand) {
    // Se marca não é válida, não podemos validar modelo
    return { isValid: false, normalized: trimmed, fipeModel: null };
  }
  
  // Buscar modelo na FIPE
  const fipeModel = await findFipeModelByName(fipeBrand.codigo, trimmed, vehicleType);
  
  if (fipeModel) {
    return {
      isValid: true,
      normalized: fipeModel.nome,
      fipeModel
    };
  }
  
  // Se não encontrou, retorna o modelo original mas inválido
  return {
    isValid: false,
    normalized: trimmed,
    fipeModel: null
  };
}

/**
 * Normaliza marca e modelo de um veículo
 * Tenta separar combinações, validar contra FIPE e normalizar
 */
export async function normalizeVehicleBrandModel(
  brand: string | null | undefined,
  model: string | null | undefined,
  vehicleType: 'carros' | 'motos' | 'caminhoes' = 'carros'
): Promise<{
  brand: string | null;
  model: string | null;
  isValid: boolean;
  wasSeparated: boolean;
  wasNormalized: boolean;
}> {
  let finalBrand = brand || null;
  let finalModel = model || null;
  let wasSeparated = false;
  let wasNormalized = false;
  
  // Se temos apenas brand e ele parece ser uma combinação, tentar separar
  if (finalBrand && !finalModel) {
    const separated = separateBrandModel(finalBrand);
    if (separated.brand && separated.model) {
      finalBrand = separated.brand;
      finalModel = separated.model;
      wasSeparated = true;
    }
  }
 
  // Se a marca está na lista de proibidas, descartar imediatamente
  if (finalBrand && isBannedBrandName(finalBrand)) {
    finalBrand = null;
  }

  // Se ainda temos uma combinação no brand, tentar separar
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
  
  // Validar e normalizar marca
  if (finalBrand) {
    const brandValidation = await validateAndNormalizeBrand(finalBrand, vehicleType);
    if (brandValidation.isValid && brandValidation.normalized) {
      if (finalBrand !== brandValidation.normalized) {
        wasNormalized = true;
      }
      finalBrand = brandValidation.normalized;
    } else if (brandValidation.normalized) {
      // Mesmo inválido, usa o normalizado
      if (finalBrand !== brandValidation.normalized) {
        wasNormalized = true;
      }
      finalBrand = brandValidation.normalized;
    } else {
      // Se não conseguiu normalizar e é inválido, retorna null
      finalBrand = null;
    }
  }
  
  // Validar e normalizar modelo (só se temos marca válida)
  if (finalModel && finalBrand) {
    const modelValidation = await validateAndNormalizeModel(finalBrand, finalModel, vehicleType);
    if (modelValidation.normalized) {
      if (finalModel !== modelValidation.normalized) {
        wasNormalized = true;
      }
      finalModel = modelValidation.normalized;
    } else {
      // Se não conseguiu validar, mantém o modelo original
      // (pode ser uma versão específica não na FIPE)
    }
  }
  
  const isValid = finalBrand !== null && finalBrand !== null;
  
  return {
    brand: finalBrand,
    model: finalModel,
    isValid,
    wasSeparated,
    wasNormalized
  };
}

/**
 * Filtra lista de marcas removendo valores inválidos
 */
export async function filterValidBrands(
  brands: string[],
  vehicleType: 'carros' | 'motos' | 'caminhoes' = 'carros'
): Promise<string[]> {
  const validBrands = new Set<string>();
  
  for (const brand of brands) {
    if (!brand || typeof brand !== 'string') continue;
    
    const trimmed = brand.trim();
    if (trimmed.length === 0) continue;
    
    // Verificar se é apenas números
    if (isOnlyNumbers(trimmed)) continue;
    
    // Verificar se é uma peça
    if (isPart(trimmed)) continue;
    
    // Verificar se é palavra inválida
    if (isInvalidBrandWord(trimmed)) continue;

    // Verificar se é marca proibida
    if (isBannedBrandName(trimmed)) continue;
    
    if (!isFipeLookupEnabled()) {
      validBrands.add(normalizeBrandName(trimmed));
      continue;
    }

    // Tentar validar na FIPE
    const validation = await validateAndNormalizeBrand(trimmed, vehicleType);
    if (validation.isValid && validation.normalized) {
      validBrands.add(validation.normalized);
    } else if (validation.normalized) {
      // Mesmo inválido, adiciona o normalizado (pode ser marca não na FIPE mas válida)
      validBrands.add(validation.normalized);
    }
  }
  
  return Array.from(validBrands).sort();
}

/**
 * Filtra lista de modelos removendo valores inválidos
 */
export async function filterValidModels(
  models: string[],
  brand: string,
  vehicleType: 'carros' | 'motos' | 'caminhoes' = 'carros'
): Promise<string[]> {
  const validModels = new Set<string>();
 
  // Buscar marca na FIPE
  const brandCandidate = applyBrandAlias(brand);
  const fipeBrand = await findFipeBrandByName(brandCandidate, vehicleType);
  if (!fipeBrand) {
    // Se marca não é válida, retorna lista vazia
    return [];
  }
  
  for (const model of models) {
    if (!model || typeof model !== 'string') continue;
    
    const trimmed = model.trim();
    if (trimmed.length === 0) continue;
    
    // Verificar se é apenas números
    if (isOnlyNumbers(trimmed)) continue;
    
    // Verificar se é uma peça
    if (isPart(trimmed)) continue;
    
    if (!isFipeLookupEnabled()) {
      validModels.add(trimmed);
      continue;
    }

    const validation = await validateAndNormalizeModel(brand, trimmed, vehicleType);
    if (validation.normalized) {
      validModels.add(validation.normalized);
    } else {
      validModels.add(trimmed);
    }
  }
  
  return Array.from(validModels).sort();
}

