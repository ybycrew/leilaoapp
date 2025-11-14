// Interface para veículos da view vehicles_with_auctioneer (campos em inglês)
export interface Vehicle {
  id: string;
  
  // Informações do leiloeiro (da view)
  auctioneer_id?: string;
  auctioneer_name?: string;
  auctioneer_slug?: string;
  auctioneer_logo?: string | null;
  
  // Identificação
  external_id?: string;
  lot_number?: string;
  
  // Informações básicas (campos em inglês)
  title: string;
  description?: string;
  brand: string;
  model: string;
  version?: string;
  year_manufacture?: number; // Ano de fabricação
  year_model?: number; // Ano do modelo
  
  // Características
  vehicle_type?: string; // "Carro", "Moto", "Caminhão", "Van", etc.
  color?: string;
  fuel_type?: string; // "Flex", "Gasolina", "Diesel", "Elétrico", etc.
  transmission?: string; // "Manual", "Automático", "CVT", etc.
  mileage?: number; // KM rodados
  license_plate?: string;
  
  // Localização
  state: string; // UF
  city: string;
  
  // Preços e valores
  current_bid?: number; // Lance atual
  minimum_bid?: number; // Lance mínimo
  appraised_value?: number; // Valor de avaliação
  fipe_price?: number; // Preço FIPE
  fipe_code?: string; // Código FIPE
  fipe_discount_percentage?: number; // Percentual de desconto em relação ao FIPE
  
  // Leilão
  auction_date?: Date | string;
  auction_type?: string; // "Presencial", "Online", "Híbrido"
  auction_status?: string; // "scheduled", "ongoing", "finished", "cancelled"
  
  // Condições
  has_financing?: boolean;
  accepts_financing?: boolean;
  condition?: string; // "Novo", "Usado", "Batido", "Sinistrado"
  
  // Score e análise
  deal_score?: number | null; // Score de 0 a 100
  
  // URLs
  original_url: string;
  thumbnail_url?: string | null;
  imagens?: string[]; // Compatibilidade: pode ser usado em alguns lugares
  
  // Metadados
  is_active?: boolean;
  views_count?: number;
  favorites_count?: number;
  scraped_at?: Date | string;
  created_at: Date | string;
  updated_at?: Date | string;
  
  // Campos de compatibilidade reversa (português) - podem ser usados por componentes antigos
  leiloeiro?: string;
  leiloeiro_url?: string;
  titulo?: string;
  marca?: string;
  modelo?: string;
  ano?: number;
  ano_modelo?: number;
  preco_inicial?: number;
  preco_atual?: number;
  km?: number;
  combustivel?: string;
  cambio?: string;
  cor?: string;
  cidade?: string;
  estado?: string;
  tipo_veiculo?: string;
  tipo_leilao?: string;
  aceita_financiamento?: boolean;
  data_leilao?: Date | string;
  descricao?: string;
  fipe_preco?: number;
  fipe_codigo?: string;
}

export interface VehicleFilter {
  // Campos em inglês (correspondem às colunas da view)
  state?: string[];
  city?: string[];
  vehicle_type?: string[];
  brand?: string[];
  model?: string[];
  year_min?: number; // year_manufacture
  year_max?: number; // year_manufacture
  price_min?: number; // current_bid
  price_max?: number; // current_bid
  mileage?: number; // KM máximo
  fuel_type?: string[];
  transmission?: string[];
  color?: string[];
  license_plate?: string;
  auction_type?: string[];
  has_financing?: boolean;
  auction_date_start?: Date;
  auction_date_end?: Date;
  deal_score_min?: number;
  search?: string;
  
  // Campos de compatibilidade reversa (português)
  estado?: string[];
  cidade?: string[];
  tipo_veiculo?: string[];
  marca?: string[];
  modelo?: string[];
  ano_min?: number;
  ano_max?: number;
  preco_min?: number;
  preco_max?: number;
  km_max?: number;
  combustivel?: string[];
  cambio?: string[];
  cor?: string[];
  tipo_leilao?: string[];
  aceita_financiamento?: boolean;
  data_inicio?: Date;
  data_fim?: Date;
}

export interface FipeData {
  codigo: string;
  marca: string;
  modelo: string;
  ano: number;
  preco: number;
  mes_referencia: string;
}

export interface DealScore {
  score: number;
  desconto_fipe: number;
  categoria: 'excelente' | 'bom' | 'justo' | 'alto';
}
