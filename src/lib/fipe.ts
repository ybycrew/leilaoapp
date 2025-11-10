import { fipeApi } from './fipe-api';

export interface FipePrice {
  codigo: string;
  marca: string;
  modelo: string;
  ano: number;
  preco: number;
  mes_referencia: string;
}

type FipeVehicleType = 'carros' | 'motos' | 'caminhoes';
type ApiVehicleType = 'cars' | 'motorcycles' | 'trucks';

const VEHICLE_TYPE_API_SLUG: Record<FipeVehicleType, ApiVehicleType> = {
  carros: 'cars',
  motos: 'motorcycles',
  caminhoes: 'trucks',
};

function toApiVehicleType(type: FipeVehicleType): ApiVehicleType {
  return VEHICLE_TYPE_API_SLUG[type] ?? 'cars';
}

function normalizeBrand(item: any): FipeBrand | null {
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

function normalizeBrandList(data: unknown): FipeBrand[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map(normalizeBrand).filter((item): item is FipeBrand => Boolean(item));
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

function normalizeModel(item: any): FipeModel | null {
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

function normalizeModelList(data: unknown): FipeModel[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map(normalizeModel).filter((item): item is FipeModel => Boolean(item));
  }
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
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

function normalizeYear(item: any): FipeYear | null {
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

function normalizeYearList(data: unknown): FipeYear[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map(normalizeYear).filter((item): item is FipeYear => Boolean(item));
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

function parsePriceToNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const sanitized = value.replace(/[R$\s.]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(sanitized);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function getFipePrice(
  marca: string,
  modelo: string,
  ano: number
): Promise<FipePrice | null> {
  try {
    const apiType = toApiVehicleType('carros');

    // 1. Buscar código da marca
    const marcasResponse = await fipeApi.get(`/${apiType}/brands`);
    const marcas = normalizeBrandList(marcasResponse.data);
    const marcaData = marcas.find((m) =>
      m.nome.toLowerCase().includes(marca.toLowerCase())
    );

    if (!marcaData) return null;

    // 2. Buscar código do modelo
    const modelosResponse = await fipeApi.get(
      `/${apiType}/brands/${marcaData.codigo}/models`
    );
    const modelos = normalizeModelList(modelosResponse.data);
    const modeloData = modelos.find((m) =>
      m.nome.toLowerCase().includes(modelo.toLowerCase())
    );

    if (!modeloData) return null;

    // 3. Buscar código do ano
    const anosResponse = await fipeApi.get(
      `/${apiType}/brands/${marcaData.codigo}/models/${modeloData.codigo}/years`
    );
    const anos = normalizeYearList(anosResponse.data);
    const anoData = anos.find((a) =>
      a.nome.includes(ano.toString())
    );

    if (!anoData) return null;

    // 4. Buscar preço
    const precoResponse = await fipeApi.get(
      `/${apiType}/brands/${marcaData.codigo}/models/${modeloData.codigo}/years/${encodeURIComponent(anoData.codigo)}`
    );

    const data = precoResponse.data;
    const precoTexto = data?.Valor ?? data?.price ?? null;
    const preco = parsePriceToNumber(precoTexto);
    if (preco === null) {
      return null;
    }

    const marcaNome = data?.Marca ?? data?.brand ?? marcaData.nome;
    const modeloNome = data?.Modelo ?? data?.model ?? modeloData.nome;
    const mesReferencia = data?.MesReferencia ?? data?.referenceMonth ?? '';
    const codeFipe = data?.CodigoFipe ?? data?.codeFipe ?? `${marcaData.codigo}-${modeloData.codigo}-${anoData.codigo}`;

    let anoModelo = data?.AnoModelo ?? data?.modelYear ?? ano;
    if (typeof anoModelo === 'string') {
      const parsedYear = Number.parseInt(anoModelo, 10);
      anoModelo = Number.isNaN(parsedYear) ? ano : parsedYear;
    }

    return {
      codigo: String(codeFipe),
      marca: String(marcaNome),
      modelo: String(modeloNome),
      ano: typeof anoModelo === 'number' ? anoModelo : ano,
      preco,
      mes_referencia: String(mesReferencia),
    };
  } catch (error) {
    console.error('Erro ao buscar preço FIPE:', error);
    return null;
  }
}

export async function batchGetFipePrice(
  vehicles: Array<{ marca: string; modelo: string; ano: number }>
) {
  const promises = vehicles.map((v) =>
    getFipePrice(v.marca, v.modelo, v.ano)
  );
  return Promise.all(promises);
}

export interface FipeBrand {
  codigo: string;
  nome: string;
}

export interface FipeModel {
  codigo: string;
  nome: string;
}

export interface FipeYear {
  codigo: string;
  nome: string;
}

/**
 * Busca todas as marcas disponíveis na FIPE
 */
export async function getAllFipeBrands(vehicleType: 'carros' | 'motos' | 'caminhoes' = 'carros'): Promise<FipeBrand[]> {
  try {
    const apiType = toApiVehicleType(vehicleType);
    const response = await fipeApi.get(`/${apiType}/brands`);
    return normalizeBrandList(response.data);
  } catch (error) {
    console.error('Erro ao buscar marcas FIPE:', error);
    return [];
  }
}

/**
 * Busca todos os modelos de uma marca na FIPE
 */
export async function getFipeModelsByBrand(
  marcaCodigo: string,
  vehicleType: 'carros' | 'motos' | 'caminhoes' = 'carros'
): Promise<FipeModel[]> {
  try {
    const apiType = toApiVehicleType(vehicleType);
    const response = await fipeApi.get(
      `/${apiType}/brands/${marcaCodigo}/models`
    );
    return normalizeModelList(response.data);
  } catch (error) {
    console.error('Erro ao buscar modelos FIPE:', error);
    return [];
  }
}

/**
 * Busca todos os anos de um modelo na FIPE
 */
export async function getFipeYearsByModel(
  marcaCodigo: string,
  modeloCodigo: string,
  vehicleType: 'carros' | 'motos' | 'caminhoes' = 'carros'
): Promise<FipeYear[]> {
  try {
    const apiType = toApiVehicleType(vehicleType);
    const response = await fipeApi.get(
      `/${apiType}/brands/${marcaCodigo}/models/${modeloCodigo}/years`
    );
    return normalizeYearList(response.data);
  } catch (error) {
    console.error('Erro ao buscar anos FIPE:', error);
    return [];
  }
}

/**
 * Busca uma marca na FIPE por nome (fuzzy match)
 */
export async function findFipeBrandByName(
  brandName: string,
  vehicleType: 'carros' | 'motos' | 'caminhoes' = 'carros'
): Promise<FipeBrand | null> {
  try {
    const brands = await getAllFipeBrands(vehicleType);
    const brandNameLower = brandName.toLowerCase().trim();
    
    // Busca exata
    let found = brands.find(b => b.nome.toLowerCase() === brandNameLower);
    if (found) return found;
    
    // Busca parcial (marca contém o nome ou vice-versa)
    found = brands.find(b => 
      b.nome.toLowerCase().includes(brandNameLower) ||
      brandNameLower.includes(b.nome.toLowerCase())
    );
    if (found) return found;
    
    // Busca por palavras-chave comuns
    const brandKeywords: Record<string, string[]> = {
      'chevrolet': ['chevrolet', 'gm', 'general motors'],
      'volkswagen': ['volkswagen', 'vw', 'volks'],
      'fiat': ['fiat'],
      'ford': ['ford'],
      'toyota': ['toyota'],
      'honda': ['honda'],
      'nissan': ['nissan'],
      'hyundai': ['hyundai'],
      'renault': ['renault'],
      'peugeot': ['peugeot'],
      'citroen': ['citroën', 'citroen'],
      'jeep': ['jeep'],
      'bmw': ['bmw'],
      'mercedes': ['mercedes', 'mercedes-benz', 'benz'],
      'audi': ['audi'],
    };
    
    for (const [key, keywords] of Object.entries(brandKeywords)) {
      if (keywords.some(k => brandNameLower.includes(k))) {
        found = brands.find(b => b.nome.toLowerCase().includes(key));
        if (found) return found;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar marca FIPE:', error);
    return null;
  }
}

/**
 * Busca um modelo na FIPE por nome (fuzzy match)
 */
export async function findFipeModelByName(
  marcaCodigo: string,
  modelName: string,
  vehicleType: 'carros' | 'motos' | 'caminhoes' = 'carros'
): Promise<FipeModel | null> {
  try {
    const models = await getFipeModelsByBrand(marcaCodigo, vehicleType);
    const modelNameLower = modelName.toLowerCase().trim();
    
    // Busca exata
    let found = models.find(m => m.nome.toLowerCase() === modelNameLower);
    if (found) return found;
    
    // Busca parcial - modelo contém o nome ou vice-versa
    found = models.find(m => 
      m.nome.toLowerCase().includes(modelNameLower) ||
      modelNameLower.includes(m.nome.toLowerCase())
    );
    if (found) return found;
    
    // Busca por primeira palavra do modelo
    const firstWord = modelNameLower.split(' ')[0];
    if (firstWord && firstWord.length > 2) {
      found = models.find(m => 
        m.nome.toLowerCase().startsWith(firstWord) ||
        m.nome.toLowerCase().includes(firstWord)
      );
      if (found) return found;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar modelo FIPE:', error);
    return null;
  }
}
