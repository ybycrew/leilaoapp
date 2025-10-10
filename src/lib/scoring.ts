import { Vehicle, DealScore } from '@/types/vehicle';

export function calculateDealScore(vehicle: Vehicle): DealScore {
  let score = 50; // Base score
  let desconto_fipe = 0;

  // 1. Desconto em relação à FIPE (peso: 40 pontos)
  if (vehicle.fipe_preco && vehicle.fipe_preco > 0) {
    desconto_fipe = ((vehicle.fipe_preco - vehicle.preco_atual) / vehicle.fipe_preco) * 100;
    
    if (desconto_fipe >= 30) {
      score += 40;
    } else if (desconto_fipe >= 20) {
      score += 30;
    } else if (desconto_fipe >= 10) {
      score += 20;
    } else if (desconto_fipe >= 5) {
      score += 10;
    } else if (desconto_fipe < 0) {
      score -= 20; // Penalidade se estiver acima da FIPE
    }
  }

  // 2. Ano do veículo (peso: 20 pontos)
  const anoAtual = new Date().getFullYear();
  const idadeVeiculo = anoAtual - vehicle.ano;
  
  if (idadeVeiculo <= 3) {
    score += 20;
  } else if (idadeVeiculo <= 5) {
    score += 15;
  } else if (idadeVeiculo <= 10) {
    score += 10;
  } else if (idadeVeiculo <= 15) {
    score += 5;
  }

  // 3. Quilometragem (peso: 15 pontos)
  if (vehicle.km) {
    if (vehicle.km < 30000) {
      score += 15;
    } else if (vehicle.km < 60000) {
      score += 10;
    } else if (vehicle.km < 100000) {
      score += 5;
    } else if (vehicle.km > 200000) {
      score -= 5;
    }
  }

  // 4. Tipo de leilão (peso: 15 pontos)
  if (vehicle.tipo_leilao === 'online') {
    score += 15;
  } else if (vehicle.tipo_leilao === 'hibrido') {
    score += 10;
  } else {
    score += 5;
  }

  // 5. Financiamento (peso: 10 pontos)
  if (vehicle.aceita_financiamento) {
    score += 10;
  }

  // Garantir que o score fique entre 0 e 100
  score = Math.max(0, Math.min(100, score));

  // Determinar categoria
  let categoria: DealScore['categoria'];
  if (score >= 80) {
    categoria = 'excelente';
  } else if (score >= 65) {
    categoria = 'bom';
  } else if (score >= 50) {
    categoria = 'justo';
  } else {
    categoria = 'alto';
  }

  return {
    score: Math.round(score),
    desconto_fipe: Math.round(desconto_fipe),
    categoria,
  };
}

export function getScoreBadgeColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 65) return 'bg-blue-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excelente Negócio';
  if (score >= 65) return 'Bom Negócio';
  if (score >= 50) return 'Preço Justo';
  return 'Preço Alto';
}
