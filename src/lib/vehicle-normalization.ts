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

/**
 * Normaliza nome de marca (CHEVROLET -> Chevrolet, FIAT -> Fiat)
 */
export function normalizeBrandName(brand: string): string {
  if (!brand || typeof brand !== 'string') return brand;
  
  const trimmed = brand.trim();
  
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
  
  // Tentar encontrar na FIPE
  const fipeBrand = await findFipeBrandByName(trimmed, vehicleType);
  
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
    normalized: normalizeBrandName(trimmed),
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
  brand: string,
  models: string[],
  vehicleType: 'carros' | 'motos' | 'caminhoes' = 'carros'
): Promise<string[]> {
  const validModels = new Set<string>();
  
  // Buscar marca na FIPE
  const fipeBrand = await findFipeBrandByName(brand, vehicleType);
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
    
    // Tentar validar na FIPE
    const validation = await validateAndNormalizeModel(brand, trimmed, vehicleType);
    if (validation.normalized) {
      validModels.add(validation.normalized);
    } else {
      // Mesmo não validado, adiciona se não for claramente inválido
      if (!isOnlyNumbers(trimmed) && !isPart(trimmed)) {
        validModels.add(trimmed);
      }
    }
  }
  
  return Array.from(validModels).sort();
}

