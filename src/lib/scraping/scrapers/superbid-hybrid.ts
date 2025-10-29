import { BaseScraper, VehicleData } from '../base-scraper';
import { extractBrandAndModel } from '../brands';

/**
 * Scraper Híbrido para o leiloeiro Superbid
 * Site: https://www.superbid.net/carros-e-motos
 * 
 * ✅ Scraper HÍBRIDO para o site do Superbid
 * - Combina estratégias de scraping para máxima eficiência
 * - Usa seletores robustos e fallbacks
 * - Implementa validação de veículos relevantes
 */
export class SuperbidHybridScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.superbid.net';
  private readonly vehicleSectionUrl = 'https://www.superbid.net/carros-e-motos';

  constructor() {
    super('Superbid');
  }

  async scrapeVehicles(): Promise<VehicleData[]> {
    if (!this.page) throw new Error('Página não inicializada');

    const vehicles: VehicleData[] = [];
    const seenIds = new Set<string>();
    const maxPages = 5; // Limite para teste
    let duplicatePageCount = 0;

    try {
      console.log(`[${this.auctioneerName}] Iniciando scraping híbrido do Superbid...`);
      console.log(`[${this.auctioneerName}] URL base: ${this.vehicleSectionUrl}`);

      // Loop através das páginas
      for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
        const pageUrl = currentPage === 1 
          ? this.vehicleSectionUrl 
          : `${this.vehicleSectionUrl}?page=${currentPage}`;

        console.log(`[${this.auctioneerName}] Acessando página ${currentPage}: ${pageUrl}`);

        try {
          await this.page.goto(pageUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          });

          // Aguardar carregamento dos veículos
          await this.page.waitForSelector('[data-testid="vehicle-card"], .vehicle-card, .auction-item', {
            timeout: 10000
          });

          // Extrair veículos da página atual
          const pageVehicles = await this.scrapePage(currentPage);
          
          if (pageVehicles.length === 0) {
            console.log(`[${this.auctioneerName}] Nenhum veículo encontrado na página ${currentPage}`);
            break;
          }

          // Filtrar duplicatas e adicionar veículos únicos
          let newVehiclesCount = 0;
          for (const vehicle of pageVehicles) {
            if (!seenIds.has(vehicle.external_id)) {
              seenIds.add(vehicle.external_id);
              vehicles.push(vehicle);
              newVehiclesCount++;
            }
          }

          console.log(`[${this.auctioneerName}] Página ${currentPage}: ${pageVehicles.length} veículos encontrados, ${newVehiclesCount} novos`);

          // Se não encontrou veículos novos, incrementar contador de páginas duplicadas
          if (newVehiclesCount === 0) {
            duplicatePageCount++;
            if (duplicatePageCount >= 2) {
              console.log(`[${this.auctioneerName}] Muitas páginas duplicadas consecutivas. Parando...`);
              break;
            }
          } else {
            duplicatePageCount = 0; // Reset contador se encontrou veículos novos
          }

          // Delay entre páginas
          if (currentPage < maxPages) {
            await this.randomDelay(1000, 2000);
          }

        } catch (pageError) {
          console.error(`[${this.auctioneerName}] Erro na página ${currentPage}:`, pageError);
          continue; // Continuar para próxima página
        }
      }

      console.log(`[${this.auctioneerName}] Scraping concluído! Total: ${vehicles.length} veículos únicos`);
      return vehicles;

    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro durante o scraping:`, error);
      throw error;
    }
  }

  private async scrapePage(pageNumber: number): Promise<VehicleData[]> {
    if (!this.page) throw new Error('Página não inicializada');

    const vehicles: VehicleData[] = [];

    try {
      // Aguardar um pouco mais para garantir carregamento
      await this.randomDelay(2000, 3000);

      // Múltiplos seletores para robustez (baseados em sites de leilão)
      const vehicleSelectors = [
        // Seletores específicos do Superbid
        '[data-testid="vehicle-card"]',
        '.vehicle-card',
        '.auction-item',
        '.lot-item',
        '.vehicle-item',
        // Seletores genéricos de leilão
        '.card',
        '.item',
        '.product',
        '.listing',
        // Seletores por estrutura HTML
        'article',
        '.auction-lot',
        '.vehicle-listing',
        // Seletores por conteúdo
        'div[class*="vehicle"]',
        'div[class*="auction"]',
        'div[class*="lot"]',
        'div[class*="item"]'
      ];

      let vehicleElements: any[] = [];
      let usedSelector = '';
      
      // Tentar cada seletor até encontrar elementos
      for (const selector of vehicleSelectors) {
        try {
          vehicleElements = await this.page.$$(selector);
          if (vehicleElements.length > 0) {
            usedSelector = selector;
            console.log(`[${this.auctioneerName}] Encontrados ${vehicleElements.length} elementos com seletor: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`[${this.auctioneerName}] Seletor ${selector} falhou:`, e);
          continue;
        }
      }

      if (vehicleElements.length === 0) {
        console.log(`[${this.auctioneerName}] Nenhum elemento encontrado na página ${pageNumber}`);
        
        // Debug: capturar HTML da página para análise
        try {
          const pageContent = await this.page.content();
          console.log(`[${this.auctioneerName}] Tamanho do HTML: ${pageContent.length} caracteres`);
          
          // Procurar por texto que indique veículos
          const hasVehicleText = pageContent.toLowerCase().includes('veículo') || 
                                pageContent.toLowerCase().includes('carro') ||
                                pageContent.toLowerCase().includes('moto') ||
                                pageContent.toLowerCase().includes('leilão');
          console.log(`[${this.auctioneerName}] Página contém texto de veículos: ${hasVehicleText}`);
        } catch (debugError) {
          console.log(`[${this.auctioneerName}] Erro no debug:`, debugError);
        }
        
        return vehicles;
      }

      console.log(`[${this.auctioneerName}] Usando seletor: ${usedSelector} com ${vehicleElements.length} elementos`);

      // Processar cada veículo
      for (let i = 0; i < vehicleElements.length; i++) {
        try {
          const vehicle = await this.extractVehicleData(vehicleElements[i], i);
          if (vehicle && this.isRelevantVehicle(vehicle)) {
            vehicles.push(vehicle);
          }
        } catch (error) {
          console.error(`[${this.auctioneerName}] Erro ao extrair veículo ${i}:`, error);
          continue;
        }
      }

    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro ao processar página ${pageNumber}:`, error);
    }

    return vehicles;
  }

  private async extractVehicleData(element: any, index: number): Promise<VehicleData | null> {
    try {
      // Extrair título com mais seletores
      const title = await this.extractText(element, [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        '.title', '.vehicle-title', '.lot-title', '.auction-title',
        '[data-testid="vehicle-title"]', '[data-testid="title"]',
        '.name', '.product-name', '.item-name',
        'a', 'span', 'div'
      ]);

      if (!title || title.length < 5) {
        console.log(`[${this.auctioneerName}] Veículo ${index}: Título não encontrado ou muito curto (${title})`);
        return null;
      }

      console.log(`[${this.auctioneerName}] Veículo ${index}: Processando "${title}"`);

      // Extrair preço com mais seletores
      const priceText = await this.extractText(element, [
        '.price', '.current-bid', '.bid-amount', '.value', '.valor',
        '[data-testid="price"]', '.auction-price', '.bid-price',
        '.money', '.currency', '.cost', '.amount',
        'span[class*="price"]', 'div[class*="price"]',
        'span[class*="bid"]', 'div[class*="bid"]',
        'span[class*="value"]', 'div[class*="value"]'
      ]);

      const currentBid = this.extractPrice(priceText);
      console.log(`[${this.auctioneerName}] Veículo ${index}: Preço extraído: ${priceText} -> ${currentBid}`);

      // Extrair imagem com mais seletores
      const imageUrl = await this.extractImageUrl(element, [
        'img', '.vehicle-image img', '.lot-image img', '.auction-image img',
        '[data-testid="vehicle-image"] img', '[data-testid="image"] img',
        '.thumbnail img', '.photo img', '.picture img',
        'img[src*="vehicle"]', 'img[src*="auction"]', 'img[src*="lot"]'
      ]);

      // Extrair link com mais seletores
      const link = await this.extractLink(element, [
        'a', '.vehicle-link', '.lot-link', '.auction-link',
        '[data-testid="vehicle-link"]', '[data-testid="link"]',
        'a[href*="vehicle"]', 'a[href*="auction"]', 'a[href*="lot"]'
      ]);

      // Extrair informações adicionais com mais seletores
      const infoText = await this.extractText(element, [
        '.info', '.details', '.vehicle-info', '.lot-info', '.auction-info',
        '[data-testid="vehicle-info"]', '[data-testid="info"]',
        '.description', '.summary', '.content',
        'p', 'span', 'div[class*="info"]', 'div[class*="detail"]'
      ]);

      // Extrair ano e quilometragem
      const year = this.extractYear(title + ' ' + (infoText || ''));
      const mileage = this.extractMileage(infoText || '');

      // Extrair marca e modelo
      const { brand, model } = extractBrandAndModel(title);

      // Gerar ID único
      const externalId = this.generateVehicleId(title, currentBid, year);

      const vehicle: VehicleData = {
        external_id: externalId,
        title: title.trim(),
        brand: brand || 'Desconhecida',
        model: model || 'Desconhecido',
        year_manufacture: year || undefined,
        year_model: year || undefined,
        vehicle_type: this.detectVehicleType(title),
        mileage: mileage || undefined,
        state: 'SP', // Default para Superbid
        city: 'São Paulo', // Default para Superbid
        current_bid: currentBid || undefined,
        auction_type: 'Online',
        condition: 'Usado',
        original_url: link || '',
        thumbnail_url: imageUrl || undefined,
        images: imageUrl ? [imageUrl] : undefined
      };

      console.log(`[${this.auctioneerName}] Veículo ${index}: ${vehicle.title} - R$ ${vehicle.current_bid || 'N/A'}`);
      console.log(`[${this.auctioneerName}] Veículo ${index}: Link: ${vehicle.original_url || 'N/A'}`);
      console.log(`[${this.auctioneerName}] Veículo ${index}: Imagem: ${vehicle.thumbnail_url || 'N/A'}`);
      return vehicle;

    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro ao extrair dados do veículo ${index}:`, error);
      return null;
    }
  }

  private async extractText(element: any, selectors: string[]): Promise<string | null> {
    for (const selector of selectors) {
      try {
        const textElement = await element.$(selector);
        if (textElement) {
          const text = await textElement.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  private async extractImageUrl(element: any, selectors: string[]): Promise<string | null> {
    for (const selector of selectors) {
      try {
        const imgElement = await element.$(selector);
        if (imgElement) {
          const src = await imgElement.getAttribute('src');
          if (src) {
            return src.startsWith('http') ? src : `${this.baseUrl}${src}`;
          }
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  private async extractLink(element: any, selectors: string[]): Promise<string | null> {
    for (const selector of selectors) {
      try {
        const linkElement = await element.$(selector);
        if (linkElement) {
          const href = await linkElement.getAttribute('href');
          if (href) {
            return href.startsWith('http') ? href : `${this.baseUrl}${href}`;
          }
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  private extractPrice(priceText: string | null): number | null {
    if (!priceText) return null;
    
    const priceMatch = priceText.match(/[\d.,]+/);
    if (priceMatch) {
      const price = parseFloat(priceMatch[0].replace(/[.,]/g, '').replace(',', '.'));
      return isNaN(price) ? null : price;
    }
    return null;
  }

  private extractYear(text: string): number | null {
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0]);
      return (year >= 1990 && year <= new Date().getFullYear() + 1) ? year : null;
    }
    return null;
  }

  private extractMileage(text: string): number | null {
    const mileageMatch = text.match(/(\d{1,3}(?:\.\d{3})*)\s*km/i);
    if (mileageMatch) {
      const mileage = parseInt(mileageMatch[1].replace(/\./g, ''));
      return isNaN(mileage) ? null : mileage;
    }
    return null;
  }

  private generateVehicleId(title: string, price: number | null, year: number | null): string {
    const baseId = title.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const priceSuffix = price ? `-${price}` : '';
    const yearSuffix = year ? `-${year}` : '';
    
    return `superbid-${baseId}${priceSuffix}${yearSuffix}`;
  }

  private detectVehicleType(title: string): string {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('moto') || titleLower.includes('motocicleta') || titleLower.includes('bike')) {
      return 'Moto';
    } else if (titleLower.includes('caminhão') || titleLower.includes('caminhao') || titleLower.includes('truck')) {
      return 'Caminhão';
    } else if (titleLower.includes('ônibus') || titleLower.includes('onibus') || titleLower.includes('bus')) {
      return 'Ônibus';
    } else if (titleLower.includes('van') || titleLower.includes('furgão') || titleLower.includes('furgão')) {
      return 'Van';
    } else {
      return 'Carro';
    }
  }

  private isRelevantVehicle(vehicle: VehicleData): boolean {
    // Filtrar veículos relevantes (menos restritivo para debug)
    if (!vehicle.title || vehicle.title.length < 5) {
      console.log(`[${this.auctioneerName}] Veículo rejeitado: título muito curto (${vehicle.title})`);
      return false;
    }
    
    // Aceitar mesmo com marca/modelo desconhecidos para debug
    if (!vehicle.brand || vehicle.brand === 'Desconhecida') {
      console.log(`[${this.auctioneerName}] Veículo com marca desconhecida: ${vehicle.title}`);
    }
    
    if (!vehicle.model || vehicle.model === 'Desconhecido') {
      console.log(`[${this.auctioneerName}] Veículo com modelo desconhecido: ${vehicle.title}`);
    }
    
    // Filtrar por preço (opcional) - mais permissivo
    if (vehicle.current_bid && vehicle.current_bid < 100) {
      console.log(`[${this.auctioneerName}] Veículo rejeitado: preço muito baixo (${vehicle.current_bid})`);
      return false;
    }
    
    console.log(`[${this.auctioneerName}] Veículo aceito: ${vehicle.title}`);
    return true;
  }
}
