import { Vehicle, DealScore } from '@/types/vehicle';

export function calculateDealScore(vehicle: Vehicle): DealScore {
  let score = 50; // Base score
  let desconto_fipe = 0;

  // Compatibilidade: usar campos em inglês ou português
  const fipePrice = vehicle.fipe_price ?? vehicle.fipe_preco;
  const currentPrice = vehicle.current_bid ?? vehicle.preco_atual ?? 0;
  const year = vehicle.year_manufacture ?? vehicle.ano;
  const mileage = vehicle.mileage ?? vehicle.km;
  const auctionType = vehicle.auction_type ?? vehicle.tipo_leilao;
  const hasFinancing = vehicle.has_financing ?? vehicle.accepts_financing ?? vehicle.aceita_financiamento ?? false;

  // 1. Desconto em relação à FIPE (peso: 40 pontos)
  if (fipePrice && fipePrice > 0 && currentPrice > 0) {
    desconto_fipe = ((fipePrice - currentPrice) / fipePrice) * 100;
    
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
  if (year) {
    const anoAtual = new Date().getFullYear();
    const idadeVeiculo = anoAtual - year;
    
    if (idadeVeiculo <= 3) {
      score += 20;
    } else if (idadeVeiculo <= 5) {
      score += 15;
    } else if (idadeVeiculo <= 10) {
      score += 10;
    } else if (idadeVeiculo <= 15) {
      score += 5;
    }
  }

  // 3. Quilometragem (peso: 15 pontos)
  if (mileage) {
    if (mileage < 30000) {
      score += 15;
    } else if (mileage < 60000) {
      score += 10;
    } else if (mileage < 100000) {
      score += 5;
    } else if (mileage > 200000) {
      score -= 5;
    }
  }

  // 4. Tipo de leilão (peso: 15 pontos)
  if (auctionType === 'online' || auctionType === 'Online') {
    score += 15;
  } else if (auctionType === 'hibrido' || auctionType === 'Híbrido' || auctionType === 'Hibrido') {
    score += 10;
  } else if (auctionType) {
    score += 5;
  }

  // 5. Financiamento (peso: 10 pontos)
  if (hasFinancing) {
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

export function getScoreBadgeColor(score: number | null | undefined): string {
  const safeScore = score ?? 0;
  if (safeScore >= 80) return 'bg-green-500';
  if (safeScore >= 65) return 'bg-blue-500';
  if (safeScore >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function getScoreLabel(score: number | null | undefined): string {
  const safeScore = score ?? 0;
  if (safeScore >= 80) return 'Excelente Negócio';
  if (safeScore >= 65) return 'Bom Negócio';
  if (safeScore >= 50) return 'Preço Justo';
  return 'Preço Alto';
}
