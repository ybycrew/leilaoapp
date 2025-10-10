export interface Vehicle {
  id: string;
  leiloeiro: string;
  leiloeiro_url: string;
  titulo: string;
  marca: string;
  modelo: string;
  ano: number;
  ano_modelo?: number;
  preco_inicial: number;
  preco_atual: number;
  km?: number;
  combustivel?: string;
  cambio?: string;
  cor?: string;
  cidade: string;
  estado: string;
  tipo_veiculo: 'carro' | 'moto' | 'caminhao' | 'van' | 'outros';
  tipo_leilao: 'online' | 'presencial' | 'hibrido';
  aceita_financiamento: boolean;
  data_leilao: Date;
  imagens: string[];
  descricao?: string;
  fipe_preco?: number;
  fipe_codigo?: string;
  deal_score: number;
  created_at: Date;
  updated_at: Date;
}

export interface VehicleFilter {
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
  deal_score_min?: number;
  search?: string;
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
