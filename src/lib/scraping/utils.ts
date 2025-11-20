/**
 * Utilitários para scraping
 */

import { calculateDealScore } from './scoring';

export { calculateDealScore };

/**
 * Normaliza tipo de veículo para formato do banco de dados
 * Garante formato consistente: "Carro", "Moto", "Caminhão", "Van"
 */
export function normalizeVehicleTypeForDB(type: string | null | undefined): string {
  if (!type) return 'Carro';
  
  const normalized = type.toLowerCase().trim();
  
  // Normalizar variações
  if (normalized === 'carro' || normalized === 'carros' || normalized === 'car') {
    return 'Carro';
  }
  if (normalized === 'moto' || normalized === 'motos' || normalized === 'motocicleta' || normalized === 'motociclismo') {
    return 'Moto';
  }
  if (normalized === 'caminhao' || normalized === 'caminhão' || normalized === 'caminhoes' || normalized === 'caminhões' || normalized === 'truck') {
    return 'Caminhão';
  }
  if (normalized === 'van' || normalized === 'minivan') {
    return 'Van';
  }
  
  // Fallback para carro
  return 'Carro';
}

/**
 * Valida se um tipo de veículo está correto baseado em características conhecidas
 */
export function validateVehicleTypeByModel(
  type: string,
  brand: string | null,
  model: string | null,
  title: string | null
): { valid: boolean; suggestedType?: string; reason?: string } {
  if (!brand || !model || !title) {
    return { valid: true }; // Sem dados suficientes, aceita qualquer tipo
  }

  const brandLower = brand.toLowerCase();
  const modelLower = model.toLowerCase();
  const titleLower = title.toLowerCase();
  const typeLower = type.toLowerCase();

  // Casos especiais conhecidos
  // Uno → sempre carro (não caminhão)
  if (modelLower.includes('uno') && typeLower !== 'carro') {
    return {
      valid: false,
      suggestedType: 'Carro',
      reason: 'Uno é sempre um carro, não caminhão'
    };
  }

  // Palio → sempre carro
  if (modelLower.includes('palio') && typeLower !== 'carro') {
    return {
      valid: false,
      suggestedType: 'Carro',
      reason: 'Palio é sempre um carro'
    };
  }

  // CB, CG, XRE → sempre moto (Honda)
  if (brandLower.includes('honda')) {
    if ((modelLower.includes('cb') || modelLower.includes('cg') || modelLower.includes('xre')) && typeLower !== 'moto') {
      return {
        valid: false,
        suggestedType: 'Moto',
        reason: 'Honda CB/CG/XRE são motos'
      };
    }
    // Civic, Fit, CRV → sempre carro
    if ((modelLower.includes('civic') || modelLower.includes('fit') || modelLower.includes('crv')) && typeLower !== 'carro') {
      return {
        valid: false,
        suggestedType: 'Carro',
        reason: 'Honda Civic/Fit/CRV são carros'
      };
    }
  }

  // Yamaha → geralmente moto
  if (brandLower.includes('yamaha')) {
    if ((modelLower.includes('xtz') || modelLower.includes('fazer') || modelLower.includes('mt')) && typeLower !== 'moto') {
      return {
        valid: false,
        suggestedType: 'Moto',
        reason: 'Yamaha XTZ/Fazer/MT são motos'
      };
    }
  }

  // Ranger → pode ser caminhão (militar) ou SUV
  if (brandLower.includes('ford') && modelLower.includes('ranger')) {
    // Se título menciona "ranger" como caminhão militar, pode ser caminhão
    if (titleLower.includes('militar') || titleLower.includes('exército') || titleLower.includes('exercito')) {
      if (typeLower !== 'caminhao' && typeLower !== 'caminhão') {
        return {
          valid: false,
          suggestedType: 'Caminhão',
          reason: 'Ford Ranger militar é caminhão'
        };
      }
    }
  }

  return { valid: true };
}
