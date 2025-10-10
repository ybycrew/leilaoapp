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
