/**
 * Database de marcas de veículos conhecidas
 * Prioridade: marcas mais comuns primeiro
 */
export const KNOWN_BRANDS = [
  // Marcas mais comuns no Brasil
  'Toyota', 'Honda', 'Volkswagen', 'Fiat', 'Chevrolet', 'Ford',
  'Nissan', 'Hyundai', 'Renault', 'Peugeot', 'Citroën', 'BMW',
  'Mercedes-Benz', 'Audi', 'Volvo', 'Mitsubishi', 'Subaru',
  'Kia', 'Mazda', 'Suzuki', 'Jeep', 'Land Rover', 'Jaguar',
  'Porsche', 'Ferrari', 'Lamborghini', 'Maserati', 'Bentley',
  'Rolls-Royce', 'Aston Martin', 'McLaren', 'Bugatti',
  
  // Marcas nacionais
  'Troller', 'Agrale', 'Effa', 'JAC', 'Chery', 'Lifan',
  'Geely', 'BYD', 'Great Wall', 'Haval', 'Dongfeng',
  
  // Marcas comerciais
  'Iveco', 'Scania', 'Volvo', 'Mercedes-Benz', 'MAN',
  'DAF', 'Renault Trucks', 'Ford Caminhões',
  
  // Marcas de motos
  'Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'Ducati',
  'Harley-Davidson', 'BMW', 'KTM', 'Triumph', 'Aprilia',
  'Moto Guzzi', 'MV Agusta', 'Benelli', 'Bajaj', 'Royal Enfield',
  
  // Variações e abreviações
  'VW', 'MB', 'BMW', 'Audi', 'VW', 'GM', 'Ford',
];

/**
 * Mapeamento de variações para marcas oficiais
 */
export const BRAND_ALIASES: Record<string, string> = {
  'VW': 'Volkswagen',
  'MB': 'Mercedes-Benz',
  'GM': 'General Motors',
  'Chevy': 'Chevrolet',
  'Merc': 'Mercedes-Benz',
  'Benz': 'Mercedes-Benz',
  'BMW': 'BMW',
  'Audi': 'Audi',
  'Volvo': 'Volvo',
  'Toyota': 'Toyota',
  'Honda': 'Honda',
  'Nissan': 'Nissan',
  'Hyundai': 'Hyundai',
  'Kia': 'Kia',
  'Mazda': 'Mazda',
  'Suzuki': 'Suzuki',
  'Mitsubishi': 'Mitsubishi',
  'Subaru': 'Subaru',
  'Peugeot': 'Peugeot',
  'Citroën': 'Citroën',
  'Renault': 'Renault',
  'Fiat': 'Fiat',
  'Ford': 'Ford',
  'Chevrolet': 'Chevrolet',
  'Jeep': 'Jeep',
  'Land Rover': 'Land Rover',
  'Jaguar': 'Jaguar',
  'Porsche': 'Porsche',
  'Ferrari': 'Ferrari',
  'Lamborghini': 'Lamborghini',
  'Maserati': 'Maserati',
  'Bentley': 'Bentley',
  'Rolls-Royce': 'Rolls-Royce',
  'Aston Martin': 'Aston Martin',
  'McLaren': 'McLaren',
  'Bugatti': 'Bugatti',
};

/**
 * Função para extrair marca e modelo do título
 */
export function extractBrandAndModel(title: string): { brand: string; model: string } {
  if (!title || typeof title !== 'string') {
    return { brand: 'Desconhecida', model: 'Desconhecido' };
  }

  const cleanTitle = title.trim();
  
  // 1. Tentar encontrar marca conhecida no título (case insensitive)
  for (const brand of KNOWN_BRANDS) {
    const brandLower = brand.toLowerCase();
    const titleLower = cleanTitle.toLowerCase();
    
    // Verificar se a marca está no início do título ou como palavra completa
    if (titleLower.startsWith(brandLower + ' ') || 
        titleLower.includes(' ' + brandLower + ' ') ||
        titleLower === brandLower) {
      
      // Remover a marca do título para obter o modelo
      let model = cleanTitle.replace(new RegExp(brand, 'gi'), '').trim();
      
      // Limpar o modelo (remover anos, versões, etc.)
      model = cleanModelName(model);
      
      return { 
        brand: BRAND_ALIASES[brand] || brand, 
        model: model || 'Desconhecido' 
      };
    }
  }
  
  // 2. Fallback: primeira palavra = marca
  const words = cleanTitle.split(' ');
  if (words.length === 0) {
    return { brand: 'Desconhecida', model: 'Desconhecido' };
  }
  
  const brand = words[0];
  const model = words.slice(1).join(' ');
  
  return { 
    brand: BRAND_ALIASES[brand] || brand, 
    model: cleanModelName(model) || 'Desconhecido' 
  };
}

/**
 * Limpa o nome do modelo removendo informações desnecessárias
 */
function cleanModelName(model: string): string {
  if (!model) return '';
  
  // Remover anos (4 dígitos)
  let cleaned = model.replace(/\b(19|20)\d{2}\b/g, '');
  
  // Remover versões comuns
  cleaned = cleaned.replace(/\b(1\.0|1\.4|1\.6|1\.8|2\.0|2\.4|2\.8|3\.0|3\.6|4\.0|4\.2|4\.6|5\.0|5\.7|6\.0|6\.2|6\.4|7\.0|8\.0)\b/gi, '');
  
  // Remover combustíveis
  cleaned = cleaned.replace(/\b(flex|gasolina|etanol|diesel|híbrido|elétrico|eletrico)\b/gi, '');
  
  // Remover transmissões
  cleaned = cleaned.replace(/\b(manual|automático|automatico|cvt|at)\b/gi, '');
  
  // Remover versões
  cleaned = cleaned.replace(/\b(ls|lt|ltz|sport|comfort|executive|premium|luxury|basic|standard)\b/gi, '');
  
  // Remover portas
  cleaned = cleaned.replace(/\b(2p|4p|2 portas|4 portas)\b/gi, '');
  
  // Remover cores comuns
  cleaned = cleaned.replace(/\b(branco|preto|prata|azul|vermelho|verde|amarelo|cinza|marrom|bege)\b/gi, '');
  
  // Limpar espaços extras
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}
