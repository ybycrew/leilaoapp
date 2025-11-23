/**
 * Utilitários para scraping
 */

import { calculateDealScore } from '../scoring';

export { calculateDealScore };

/**
 * Normaliza tipo de veículo para formato do banco de dados Supabase
 * Garante formato consistente: 'carro', 'moto', 'caminhao', 'van', 'outros'
 */
export function normalizeVehicleTypeForDB(type: string | null | undefined): string {
  if (!type) return 'carro';
  
  const normalized = type.toLowerCase().trim();
  
  // Normalizar variações
  if (normalized === 'carro' || normalized === 'carros' || normalized === 'car') {
    return 'carro';
  }
  if (normalized === 'moto' || normalized === 'motos' || normalized === 'motocicleta' || normalized === 'motociclismo') {
    return 'moto';
  }
  if (normalized === 'caminhao' || normalized === 'caminhão' || normalized === 'caminhoes' || normalized === 'caminhões' || normalized === 'truck' || normalized === 'onibus' || normalized === 'ônibus') {
    return 'caminhao';
  }
  if (normalized === 'van' || normalized === 'minivan' || normalized === 'furgao' || normalized === 'furgão') {
    return 'van';
  }
  
  // Fallback para carro
  return 'carro';
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
      suggestedType: 'carro',
      reason: 'Uno é sempre um carro, não caminhão'
    };
  }

  // Palio → sempre carro
  if (modelLower.includes('palio') && typeLower !== 'carro') {
    return {
      valid: false,
      suggestedType: 'carro',
      reason: 'Palio é sempre um carro'
    };
  }

  // CB, CG, XRE → sempre moto (Honda)
  if (brandLower.includes('honda')) {
    if ((modelLower.includes('cb') || modelLower.includes('cg') || modelLower.includes('xre')) && typeLower !== 'moto') {
      return {
        valid: false,
        suggestedType: 'moto',
        reason: 'Honda CB/CG/XRE são motos'
      };
    }
    // Civic, Fit, CRV → sempre carro
    if ((modelLower.includes('civic') || modelLower.includes('fit') || modelLower.includes('crv')) && typeLower !== 'carro') {
      return {
        valid: false,
        suggestedType: 'carro',
        reason: 'Honda Civic/Fit/CRV são carros'
      };
    }
  }

  // Yamaha → geralmente moto
  if (brandLower.includes('yamaha')) {
    if ((modelLower.includes('xtz') || modelLower.includes('fazer') || modelLower.includes('mt')) && typeLower !== 'moto') {
      return {
        valid: false,
        suggestedType: 'moto',
        reason: 'Yamaha XTZ/Fazer/MT são motos'
      };
    }
  }

  // Ranger → caminhonete permanece como carro (não caminhão)
  // Apenas se for militar específico vira caminhão
  if (brandLower.includes('ford') && modelLower.includes('ranger')) {
    // Se título menciona "ranger" como caminhão militar, pode ser caminhão
    if (titleLower.includes('militar') || titleLower.includes('exército') || titleLower.includes('exercito') || titleLower.includes('força')) {
      if (typeLower !== 'caminhao') {
        return {
          valid: false,
          suggestedType: 'caminhao',
          reason: 'Ford Ranger militar é caminhão'
        };
      }
    } else {
      // Ranger civil é carro (caminhonete)
      if (typeLower !== 'carro') {
        return {
          valid: false,
          suggestedType: 'carro',
          reason: 'Ford Ranger civil é caminhonete (carro)'
        };
      }
    }
  }

  // S10, Hilux, Amarok → caminhonetes são carros
  if ((modelLower.includes('s10') || modelLower.includes('hilux') || modelLower.includes('amarok') || 
       modelLower.includes('l200') || modelLower.includes('frontier') || modelLower.includes('saveiro')) && 
      typeLower !== 'carro') {
    return {
      valid: false,
      suggestedType: 'carro',
      reason: 'Caminhonetes são classificadas como carros'
    };
  }

  return { valid: true };
}
