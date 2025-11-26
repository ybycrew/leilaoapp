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
  if (normalized === 'caminhao' || normalized === 'caminhão' || normalized === 'caminhoes' || normalized === 'caminhões' || normalized === 'truck') {
    return 'caminhao';
  }
  if (normalized === 'van' || normalized === 'minivan' || normalized === 'furgao' || normalized === 'furgão') {
    return 'van';
  }
  if (normalized === 'onibus' || normalized === 'ônibus') {
    return 'outros'; // Ônibus vai para 'outros' conforme schema do banco
  }
  if (normalized === 'embarcacoes' || normalized === 'embarcações' || normalized === 'barco' || normalized === 'lancha') {
    return 'outros'; // Embarcações vai para 'outros' conforme schema do banco
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
  
  // Carros populares que NUNCA são caminhões/motos
  const commonCars = [
    'uno', 'palio', 'gol', 'fox', 'celta', 'corsa', 'onix', 'prisma', 'hb20', 
    'ka', 'fiesta', 'focus', 'ecosport', 'fit', 'civic', 'crv', 'hrv', 'wrv',
    'corolla', 'etios', 'yaris', 'sandero', 'logan', 'duster', 'kwid',
    'argo', 'cronos', 'mobi', 'pulse', 'toro', 'renegade', 'compass',
    'polo', 'virtus', 'voyage', 'saveiro', 'nivus', 't-cross', 'jetta',
    'bravo', 'punto', 'siena', 'idea', 'linea', 'doblo',
    'cruze', 'tracker', 'spin', 'cobalt', 'sonic', 'agile', 'montana',
    '208', '2008', '3008', 'c3', 'c4', 'cactus',
    'i30', 'ix35', 'tucson', 'creta', 'hb20s', 'hb20x',
    'kicks', 'versa', 'march', 'sentra'
  ];

  if (commonCars.some(car => modelLower.includes(car))) {
    // Exceção: "Uno" pode dar match em "Nuno" (raro), mas "Uno" é seguro.
    // "Ka" é perigoso? "Kawasaki"? Não, Kawasaki é marca.
    if (typeLower !== 'carro') {
      return {
        valid: false,
        suggestedType: 'carro',
        reason: `Modelo '${modelLower}' é um carro conhecido`
      };
    }
  }

  // Marcas de luxo que são primariamente carros (no contexto de leilão comum)
  // A menos que o modelo seja explicitamente de caminhão
  const luxuryCarBrands = ['mercedes', 'bmw', 'audi', 'volvo', 'porsche', 'land rover', 'jaguar', 'mini'];
  
  if (luxuryCarBrands.some(b => brandLower.includes(b))) {
    // Lista de modelos de caminhão dessas marcas para excluir da regra
    const truckModels = [
      'accelo', 'atego', 'axor', 'actros', 'sprinter', // Mercedes
      'fh', 'fm', 'fmx', 'vm', // Volvo
    ];
    
    const isTruckModel = truckModels.some(m => modelLower.includes(m));
    
    if (!isTruckModel && typeLower !== 'carro' && typeLower !== 'van') {
       return {
        valid: false,
        suggestedType: 'carro',
        reason: `Marca '${brand}' geralmente fabrica carros (modelo não identificado como caminhão)`
      };
    }
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
