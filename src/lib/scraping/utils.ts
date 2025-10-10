/**
 * Calcula o Deal Score de um veículo (0-100)
 * Baseado em: desconto FIPE, ano, quilometragem, tipo de leilão, financiamento
 */
export function calculateDealScore(params: {
  fipeDiscount: number;
  year: number;
  mileage: number;
  auctionType: string;
  hasFinancing: boolean;
}): number {
  let score = 0;
  const currentYear = new Date().getFullYear();

  // 1. Desconto FIPE (0-40 pontos)
  // Quanto maior o desconto, melhor
  score += Math.min(Math.max(params.fipeDiscount * 0.8, 0), 40);

  // 2. Ano do veículo (0-20 pontos)
  // Quanto mais novo, melhor
  const yearDiff = currentYear - params.year;
  if (yearDiff <= 0) {
    score += 20; // Carro 0km ou do ano
  } else if (yearDiff <= 2) {
    score += 18; // Até 2 anos
  } else if (yearDiff <= 5) {
    score += 15; // Até 5 anos
  } else if (yearDiff <= 10) {
    score += 10; // Até 10 anos
  } else if (yearDiff <= 15) {
    score += 5; // Até 15 anos
  }
  // Acima de 15 anos = 0 pontos

  // 3. Quilometragem (0-15 pontos)
  // Quanto menor a KM, melhor
  if (params.mileage < 30000) {
    score += 15;
  } else if (params.mileage < 60000) {
    score += 12;
  } else if (params.mileage < 100000) {
    score += 8;
  } else if (params.mileage < 150000) {
    score += 4;
  }
  // Acima de 150k km = 0 pontos

  // 4. Tipo de leilão (0-15 pontos)
  // Online é mais conveniente
  switch (params.auctionType.toLowerCase()) {
    case 'online':
      score += 15;
      break;
    case 'híbrido':
    case 'hibrido':
      score += 10;
      break;
    case 'presencial':
      score += 5;
      break;
    default:
      score += 0;
  }

  // 5. Financiamento (0-10 pontos)
  // Sem financiamento é melhor (menos burocracia)
  if (!params.hasFinancing) {
    score += 10;
  }

  // Garantir que o score está entre 0 e 100
  return Math.min(Math.max(Math.round(score), 0), 100);
}

/**
 * Normaliza URL removendo parâmetros desnecessários
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

/**
 * Limpa texto removendo espaços extras e quebras de linha
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Múltiplos espaços vira um
    .replace(/\n+/g, ' ') // Quebras de linha viram espaço
    .trim();
}

/**
 * Converte data brasileira (DD/MM/YYYY) para ISO
 */
export function parseBrazilianDate(dateString: string): Date | null {
  const match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;

  const [, day, month, year] = match;
  const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);

  return isNaN(date.getTime()) ? null : date;
}

/**
 * Extrai números de uma string
 */
export function extractNumber(text: string): number | null {
  const match = text.match(/\d+(?:[.,]\d+)?/);
  if (!match) return null;

  const normalized = match[0].replace(',', '.');
  const number = parseFloat(normalized);

  return isNaN(number) ? null : number;
}

/**
 * Verifica se uma URL é válida
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gera um slug a partir de um texto
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres especiais por hífen
    .replace(/^-+|-+$/g, ''); // Remove hífens do início/fim
}

