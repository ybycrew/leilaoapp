/**
 * Classificador Multi-Camada de Tipos de Veículos
 * 
 * Implementa uma estratégia inteligente para classificar corretamente
 * tipos de veículos usando múltiplas fontes de validação:
 * 1. FIPE (fonte primária)
 * 2. Palavras-chave no título
 * 3. Características do veículo
 * 4. Validação estatística
 */

import { findVehicleTypeInFipe, mapFipeTypeToVehicleType } from './vehicle-normalization';

export type VehicleType = 'carro' | 'moto' | 'caminhao' | 'van' | 'outros';

export interface ClassificationResult {
  type: VehicleType;
  confidence: number; // 0-100
  source: 'fipe' | 'title' | 'characteristics' | 'fallback';
  reasons: string[];
}

/**
 * Extrai palavras-chave do título que indicam tipo de veículo
 */
function extractTypeFromTitle(title: string): { type: VehicleType | null; confidence: number; keywords: string[] } {
  const titleLower = title.toLowerCase();
  const keywords: string[] = [];
  let type: VehicleType | null = null;
  let confidence = 0;

  // Palavras-chave para motos
  const motoKeywords = [
    'moto', 'motocicleta', 'motociclismo', 'motoneta', 'scooter',
    'cb 300', 'cb 250', 'cb 500', 'cb 600', 'cb 1000',
    'cg 125', 'cg 150', 'cg 160',
    'titan 125', 'titan 150', 'titan 160', // Titan com cilindrada para não confundir com Ford Titanium
    'fan 125', 'fan 150', 'fan 160',
    'xre', 'xtz', 'fazer', 'mt-03', 'mt-07', 'mt-09', 'crosser', 'biz',
    'hornet', 'cbr', 'twister', 'factor', 'pop', 'bros', 'pcx', 'nmax', 'neo'
  ];

  // Palavras-chave para caminhões
  // REMOVIDO marcas que fabricam carros também (Mercedes, Volvo) para evitar falsos positivos
  const caminhaoKeywords = [
    'caminhão', 'caminhao', 'truck', 'ônibus', 'onibus', 'bus',
    'carreta', 'bitrem', 'rodotrem', 'cavalo mecânico', 'cavalo mecanico', 'toco',
    'scania', 'iveco', 'daf', 'man', 'agrale', // Marcas que só/quase só fazem caminhões no BR
    'accelo', 'atego', 'axor', 'actros', // Modelos Mercedes caminhão
    'fh', 'fm', 'vm', // Modelos Volvo caminhão
    'cargo', 'constellation', 'delivery', 'worker', // Modelos VW/Ford caminhão
    'stralis', 'tector', 'eurocargo', // Modelos Iveco
    'ranger militar', 'viatura militar', // Ranger específico
    'militar', 'exército', 'exercito'
  ];

  // Palavras-chave para vans
  const vanKeywords = [
    'van', 'minivan', 'kombi', 'master', 'ducato', 'sprinter',
    'furgão', 'furgão', 'furgon', 'panel'
  ];

  // Palavras-chave para carros (contexto negativo)
  const carroKeywords = [
    'hatch', 'sedan', 'suv', 'crossover', 'coupe', 'pickup',
    'picape', 'wagon', 'station', 'executivo'
  ];

  // Detectar motos
  for (const keyword of motoKeywords) {
    if (titleLower.includes(keyword)) {
      keywords.push(keyword);
      if (!type || (type !== 'moto' && confidence < 85)) {
        type = 'moto';
        confidence = keyword.length > 3 ? 85 : 70; // Palavras maiores são mais confiáveis
      }
    }
  }

  // Detectar caminhões (maior precedência se encontrado)
  for (const keyword of caminhaoKeywords) {
    if (titleLower.includes(keyword)) {
      keywords.push(keyword);
      type = 'caminhao';
      confidence = keyword.length > 4 ? 90 : 80;
      break; // Caminhão tem precedência sobre moto se ambos aparecerem
    }
  }

  // Detectar vans
  for (const keyword of vanKeywords) {
    if (titleLower.includes(keyword)) {
      keywords.push(keyword);
      if (!type || (type !== 'van' && confidence < 80)) {
        type = 'van';
        confidence = 80;
      }
    }
  }

  // Se não encontrou nada, pode ser carro (fallback implícito)
  if (!type && titleLower.length > 5) {
    // Se tem palavras de carro, aumenta confiança de ser carro
    const hasCarroKeyword = carroKeywords.some(k => titleLower.includes(k));
    if (hasCarroKeyword) {
      type = 'carro';
      confidence = 60;
    }
  }

  return { type, confidence, keywords };
}

/**
 * Valida tipo baseado em características do veículo
 */
function validateTypeByCharacteristics(
  type: VehicleType,
  brand: string | null,
  model: string | null,
  fuelType: string | null,
  mileage: number | null,
  price: number | null
): { valid: boolean; confidence: number; reason: string } {
  // Validações básicas
  if (type === 'moto') {
    // Motos geralmente não usam diesel
    if (fuelType && fuelType.toLowerCase().includes('diesel')) {
      return { valid: false, confidence: 20, reason: 'Moto não usa diesel' };
    }
    // Motos geralmente têm KM menor que caminhões
    if (mileage && mileage > 150000) {
      return { valid: true, confidence: 70, reason: 'Moto com KM alto (pode ser correta)' };
    }
  }

  if (type === 'caminhao') {
    // Caminhões geralmente usam diesel
    if (fuelType && !fuelType.toLowerCase().includes('diesel')) {
      return { valid: true, confidence: 60, reason: 'Caminhão sem diesel (pode ser correto)' };
    }
    // Caminhões geralmente são mais caros
    if (price && price < 20000) {
      return { valid: true, confidence: 60, reason: 'Caminhão barato (pode ser correto)' };
    }
  }

  // Casos especiais conhecidos
  if (brand && model) {
    const brandLower = brand.toLowerCase();
    const modelLower = model.toLowerCase();

    // Honda - precisa validar modelo
    if (brandLower.includes('honda')) {
      if (modelLower.includes('civic') || modelLower.includes('fit') || modelLower.includes('crv')) {
        if (type !== 'carro') {
          return { valid: false, confidence: 10, reason: 'Honda Civic/Fit/CRV são carros' };
        }
      }
      if (modelLower.includes('cb') || modelLower.includes('cg') || modelLower.includes('xre')) {
        if (type !== 'moto') {
          return { valid: false, confidence: 10, reason: 'Honda CB/CG/XRE são motos' };
        }
      }
    }

    // Yamaha - geralmente motos
    if (brandLower.includes('yamaha')) {
      if (modelLower.includes('xtz') || modelLower.includes('fazer')) {
        if (type !== 'moto') {
          return { valid: false, confidence: 10, reason: 'Yamaha XTZ/Fazer são motos' };
        }
      }
    }

    // Ford Ranger - pode ser caminhão ou SUV
    if (brandLower.includes('ford') && modelLower.includes('ranger')) {
      // Verificar no título se menciona "ranger" como caminhão militar
      if (type === 'caminhao') {
        return { valid: true, confidence: 70, reason: 'Ford Ranger pode ser caminhão militar' };
      }
    }
  }

  return { valid: true, confidence: 80, reason: 'Características compatíveis' };
}

/**
 * Classifica tipo de veículo usando estratégia multi-camada
 */
export async function classifyVehicleType(
  title: string,
  brand: string | null,
  model: string | null,
  fuelType: string | null = null,
  mileage: number | null = null,
  price: number | null = null
): Promise<ClassificationResult> {
  const reasons: string[] = [];
  let finalType: VehicleType = 'carro';
  let finalConfidence = 50;
  let finalSource: ClassificationResult['source'] = 'fallback';

  // Camada 1: FIPE (fonte primária - máxima confiança)
  if (brand) {
    try {
      const fipeResult = await findVehicleTypeInFipe(brand, model);
      
      if (fipeResult.isValid && fipeResult.type) {
        const fipeType = mapFipeTypeToVehicleType(fipeResult.type) as VehicleType;
        finalType = fipeType;
        finalConfidence = 95;
        finalSource = 'fipe';
        reasons.push(`FIPE: ${fipeType} (marca: ${brand}${model ? `, modelo: ${model}` : ''})`);

        // Validar com características (ajustar confiança se necessário)
        const characteristicValidation = validateTypeByCharacteristics(
          finalType,
          brand,
          model,
          fuelType,
          mileage,
          price
        );

        if (!characteristicValidation.valid) {
          // Conflito detectado - reduzir confiança mas manter FIPE como fonte
          finalConfidence = 70;
          reasons.push(`⚠️  Conflito com características: ${characteristicValidation.reason}`);
        } else if (characteristicValidation.confidence < finalConfidence) {
          finalConfidence = characteristicValidation.confidence;
          reasons.push(`Validação: ${characteristicValidation.reason}`);
        }

        return {
          type: finalType,
          confidence: finalConfidence,
          source: finalSource,
          reasons
        };
      } else {
        reasons.push(`FIPE: marca/modelo não encontrado`);
      }
    } catch (error: any) {
      reasons.push(`FIPE: erro ao buscar - ${error.message}`);
    }
  } else {
    reasons.push(`FIPE: sem marca para validar`);
  }

  // Camada 2: Palavras-chave no título (alta confiança)
  const titleExtraction = extractTypeFromTitle(title);
  if (titleExtraction.type && titleExtraction.confidence > 70) {
    // Se FIPE não encontrou, usar título
    if (finalSource === 'fallback') {
      finalType = titleExtraction.type;
      finalConfidence = titleExtraction.confidence;
      finalSource = 'title';
      reasons.push(`Título: ${titleExtraction.type} (palavras-chave: ${titleExtraction.keywords.join(', ')})`);

      // Validar com características
      const characteristicValidation = validateTypeByCharacteristics(
        finalType,
        brand,
        model,
        fuelType,
        mileage,
        price
      );

      if (!characteristicValidation.valid) {
        finalConfidence = Math.max(50, finalConfidence - 20);
        reasons.push(`⚠️  Conflito com características: ${characteristicValidation.reason}`);
      }

      return {
        type: finalType,
        confidence: finalConfidence,
        source: finalSource,
        reasons
      };
    } else {
      // FIPE encontrou, mas validar com título
      if (titleExtraction.type !== finalType) {
        reasons.push(`⚠️  Título sugere ${titleExtraction.type}, mas FIPE indica ${finalType}`);
        // Reduzir confiança se há conflito
        finalConfidence = Math.max(60, finalConfidence - 15);
      }
    }
  }

  // Camada 3: Características (baixa confiança, apenas validação)
  if (finalSource === 'fallback') {
    // Tentar inferir do título mesmo com baixa confiança
    if (titleExtraction.type && titleExtraction.confidence > 50) {
      finalType = titleExtraction.type;
      finalConfidence = titleExtraction.confidence;
      finalSource = 'title';
      reasons.push(`Título (baixa confiança): ${titleExtraction.type}`);
    }
  }

  // Fallback final
  if (finalSource === 'fallback') {
    finalType = 'carro';
    finalConfidence = 50;
    reasons.push('Fallback: assumindo carro (padrão)');
  }

  return {
    type: finalType,
    confidence: finalConfidence,
    source: finalSource,
    reasons
  };
}

