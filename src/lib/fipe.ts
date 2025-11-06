import axios from 'axios';

const FIPE_API_URL = 'https://parallelum.com.br/fipe/api/v1';

export interface FipePrice {
  codigo: string;
  marca: string;
  modelo: string;
  ano: number;
  preco: number;
  mes_referencia: string;
}

export async function getFipePrice(
  marca: string,
  modelo: string,
  ano: number
): Promise<FipePrice | null> {
  try {
    // 1. Buscar código da marca
    const marcasResponse = await axios.get(`${FIPE_API_URL}/carros/marcas`);
    const marcaData = marcasResponse.data.find((m: any) =>
      m.nome.toLowerCase().includes(marca.toLowerCase())
    );

    if (!marcaData) return null;

    // 2. Buscar código do modelo
    const modelosResponse = await axios.get(
      `${FIPE_API_URL}/carros/marcas/${marcaData.codigo}/modelos`
    );
    const modeloData = modelosResponse.data.modelos.find((m: any) =>
      m.nome.toLowerCase().includes(modelo.toLowerCase())
    );

    if (!modeloData) return null;

    // 3. Buscar código do ano
    const anosResponse = await axios.get(
      `${FIPE_API_URL}/carros/marcas/${marcaData.codigo}/modelos/${modeloData.codigo}/anos`
    );
    const anoData = anosResponse.data.find((a: any) =>
      a.nome.includes(ano.toString())
    );

    if (!anoData) return null;

    // 4. Buscar preço
    const precoResponse = await axios.get(
      `${FIPE_API_URL}/carros/marcas/${marcaData.codigo}/modelos/${modeloData.codigo}/anos/${anoData.codigo}`
    );

    const data = precoResponse.data;
    const preco = parseFloat(
      data.Valor.replace(/[R$.\s]/g, '').replace(',', '.')
    );

    return {
      codigo: `${marcaData.codigo}-${modeloData.codigo}-${anoData.codigo}`,
      marca: data.Marca,
      modelo: data.Modelo,
      ano: parseInt(data.AnoModelo),
      preco,
      mes_referencia: data.MesReferencia,
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
    const response = await axios.get(`${FIPE_API_URL}/${vehicleType}/marcas`);
    return response.data;
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
    const response = await axios.get(
      `${FIPE_API_URL}/${vehicleType}/marcas/${marcaCodigo}/modelos`
    );
    return response.data.modelos || [];
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
    const response = await axios.get(
      `${FIPE_API_URL}/${vehicleType}/marcas/${marcaCodigo}/modelos/${modeloCodigo}/anos`
    );
    return response.data || [];
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
