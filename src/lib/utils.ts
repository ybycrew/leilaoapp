import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Lista de estados brasileiros válidos (UF)
const BRAZILIAN_STATES = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]);

// Palavras que indicam que uma cidade não é válida
const INVALID_CITY_KEYWORDS = [
  'BANCO', 'SEGURADORA', 'FINANCEIRA', 'CONCESSIONÁRIA',
  'CONCESSIONARIA', 'AUTOMOTIVA', 'LEILÃO', 'LEILAO',
  'AUTOMÓVEIS', 'AUTOMOVEIS', 'VEÍCULOS', 'VEICULOS'
];

/**
 * Valida se um estado (UF) é válido
 */
export function isValidBrazilianState(state: string | null | undefined): boolean {
  if (!state || typeof state !== 'string') return false;
  const normalized = state.trim().toUpperCase();
  return BRAZILIAN_STATES.has(normalized);
}

/**
 * Valida se uma cidade é válida (não contém palavras-chave inválidas)
 */
export function isValidCity(city: string | null | undefined): boolean {
  if (!city || typeof city !== 'string') return false;
  const normalized = city.trim().toUpperCase();
  
  // Verificar se contém palavras-chave inválidas
  for (const keyword of INVALID_CITY_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return false;
    }
  }
  
  // Cidade deve ter pelo menos 2 caracteres
  return normalized.length >= 2;
}

/**
 * Filtra e valida uma lista de estados
 */
export function filterValidStates(states: (string | null | undefined)[]): string[] {
  return states
    .filter(isValidBrazilianState)
    .map(s => s!.trim().toUpperCase())
    .filter((s, i, arr) => arr.indexOf(s) === i) // Remove duplicatas
    .sort();
}

/**
 * Filtra e valida uma lista de cidades
 */
export function filterValidCities(cities: (string | null | undefined)[]): string[] {
  return cities
    .filter(isValidCity)
    .map(c => c!.trim())
    .filter((c, i, arr) => arr.indexOf(c) === i) // Remove duplicatas
    .sort();
}
