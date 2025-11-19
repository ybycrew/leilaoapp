/**
 * Re-export dos tipos gerados pelo Supabase CLI
 * 
 * Este arquivo re-exporta os tipos gerados e fornece helpers type-safe
 * para trabalhar com o schema real do Supabase.
 */

import { Database } from '@/types/database.types';

// Re-export tipos gerados
export type { Database } from '@/types/database.types';

// Tipos helper para a tabela vehicles
export type VehicleRow = Database['public']['Tables']['vehicles']['Row'];
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update'];

// Tipos helper para a view vehicles_with_auctioneer
export type VehicleWithAuctioneerRow = Database['public']['Views']['vehicles_with_auctioneer']['Row'];

// Tipos helper para a tabela auctioneers
export type AuctioneerRow = Database['public']['Tables']['auctioneers']['Row'];
export type AuctioneerInsert = Database['public']['Tables']['auctioneers']['Insert'];
export type AuctioneerUpdate = Database['public']['Tables']['auctioneers']['Update'];

// Tipos helper para tabelas FIPE
export type FipeVehicleTypeRow = Database['public']['Tables']['fipe_vehicle_types']['Row'];
export type FipeBrandRow = Database['public']['Tables']['fipe_brands']['Row'];
export type FipeModelRow = Database['public']['Tables']['fipe_models']['Row'];
export type FipeModelYearRow = Database['public']['Tables']['fipe_model_years']['Row'];
export type FipePriceReferenceRow = Database['public']['Tables']['fipe_price_references']['Row'];

/**
 * Lista de colunas obrigatórias na tabela vehicles (Insert)
 */
export const REQUIRED_VEHICLE_COLUMNS: Array<keyof VehicleInsert> = [
  'title',
  'brand',
  'model',
  'state',
  'city',
  'original_url',
  'auctioneer_id',
];

/**
 * Lista de colunas opcionais na tabela vehicles (Insert)
 */
export const OPTIONAL_VEHICLE_COLUMNS: Array<keyof VehicleInsert> = [
  'description',
  'version',
  'year_model',
  'year_manufacture',
  'vehicle_type',
  'color',
  'fuel_type',
  'transmission',
  'mileage',
  'license_plate',
  'current_bid',
  'minimum_bid',
  'appraised_value',
  'auction_type',
  'auction_status',
  'auction_date',
  'has_financing',
  'accepts_financing',
  'aceita_financiamento',
  'fipe_price',
  'fipe_code',
  'fipe_discount_percentage',
  'deal_score',
  'thumbnail_url',
  'external_id',
  'lot_number',
  'is_active',
  'views_count',
  'favorites_count',
  'scraped_at',
  'condition',
  'leiloeiro',
  'created_at',
  'updated_at',
];

/**
 * Verifica se uma coluna existe na tabela vehicles
 */
export function isValidVehicleColumn(column: string): column is keyof VehicleRow {
  const allColumns: Array<keyof VehicleRow> = [
    ...REQUIRED_VEHICLE_COLUMNS,
    ...OPTIONAL_VEHICLE_COLUMNS,
    'id', // PK
  ];
  return allColumns.includes(column as keyof VehicleRow);
}

/**
 * Lista de colunas que NÃO existem na tabela vehicles (do schema.sql antigo)
 * Essas colunas NÃO devem ser usadas no código
 */
export const DEPRECATED_VEHICLE_COLUMNS = [
  'tipo_veiculo', // usar vehicle_type
  'marca', // usar brand
  'modelo', // usar model
  'titulo', // usar title
  'descricao', // usar description
  'ano', // usar year_model ou year_manufacture
  'ano_modelo', // usar year_model
  'cor', // usar color
  'combustivel', // usar fuel_type
  'cambio', // usar transmission
  'km', // usar mileage
  'estado', // usar state
  'cidade', // usar city
  'preco_inicial', // usar minimum_bid
  'preco_atual', // usar current_bid
  'tipo_leilao', // usar auction_type
  'data_leilao', // usar auction_date
  'fipe_preco', // usar fipe_price
  'fipe_codigo', // usar fipe_code
  'leiloeiro_url', // usar auctioneer_id + join
  'imagens', // usar campo separado
];

/**
 * Mapeamento de colunas antigas (português) para novas (inglês)
 */
export const COLUMN_MAPPING: Record<string, keyof VehicleRow> = {
  'tipo_veiculo': 'vehicle_type',
  'marca': 'brand',
  'modelo': 'model',
  'titulo': 'title',
  'descricao': 'description',
  'ano': 'year_model',
  'ano_modelo': 'year_model',
  'cor': 'color',
  'combustivel': 'fuel_type',
  'cambio': 'transmission',
  'km': 'mileage',
  'estado': 'state',
  'cidade': 'city',
  'preco_inicial': 'minimum_bid',
  'preco_atual': 'current_bid',
  'tipo_leilao': 'auction_type',
  'data_leilao': 'auction_date',
  'fipe_preco': 'fipe_price',
  'fipe_codigo': 'fipe_code',
  'aceita_financiamento': 'accepts_financing',
  'leiloeiro': 'leiloeiro', // Existe mas é legado, usar auctioneer_id
};

