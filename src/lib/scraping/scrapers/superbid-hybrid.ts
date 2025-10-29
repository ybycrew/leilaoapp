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
            if (!seenIds.has(vehicle.id)) {
              seenIds.add(vehicle.id);
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
            await this.page.waitForTimeout(2000);
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
      // Múltiplos seletores para robustez
      const vehicleSelectors = [
        '[data-testid="vehicle-card"]',
        '.vehicle-card',
        '.auction-item',
        '.lot-item',
        '.vehicle-item'
      ];

      let vehicleElements: any[] = [];
      
      // Tentar cada seletor até encontrar elementos
      for (const selector of vehicleSelectors) {
        try {
          vehicleElements = await this.page.$$(selector);
          if (vehicleElements.length > 0) {
            console.log(`[${this.auctioneerName}] Encontrados ${vehicleElements.length} veículos com seletor: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (vehicleElements.length === 0) {
        console.log(`[${this.auctioneerName}] Nenhum veículo encontrado na página ${pageNumber}`);
        return vehicles;
      }

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
      // Extrair título
      const title = await this.extractText(element, [
        'h3', 'h4', '.title', '.vehicle-title', '.lot-title',
        '[data-testid="vehicle-title"]', '.auction-title'
      ]);

      if (!title) {
        console.log(`[${this.auctioneerName}] Veículo ${index}: Título não encontrado`);
        return null;
      }

      // Extrair preço
      const priceText = await this.extractText(element, [
        '.price', '.current-bid', '.bid-amount', '.value',
        '[data-testid="price"]', '.auction-price'
      ]);

      const currentBid = this.extractPrice(priceText);

      // Extrair imagem
      const imageUrl = await this.extractImageUrl(element, [
        'img', '.vehicle-image img', '.lot-image img',
        '[data-testid="vehicle-image"] img'
      ]);

      // Extrair link
      const link = await this.extractLink(element, [
        'a', '.vehicle-link', '.lot-link',
        '[data-testid="vehicle-link"]'
      ]);

      // Extrair informações adicionais
      const infoText = await this.extractText(element, [
        '.info', '.details', '.vehicle-info', '.lot-info',
        '[data-testid="vehicle-info"]'
      ]);

      // Extrair ano e quilometragem
      const year = this.extractYear(title + ' ' + (infoText || ''));
      const mileage = this.extractMileage(infoText || '');

      // Extrair marca e modelo
      const { brand, model } = extractBrandAndModel(title);

      // Gerar ID único
      const id = this.generateVehicleId(title, currentBid, year);

      const vehicle: VehicleData = {
        id,
        title: title.trim(),
        brand: brand || 'Desconhecida',
        model: model || 'Desconhecido',
        year_manufacture: year,
        year_model: year,
        mileage: mileage,
        current_bid: currentBid,
        image_url: imageUrl,
        auction_url: link,
        auctioneer: this.auctioneerName,
        scraped_at: new Date().toISOString(),
        is_relevant: true
      };

      console.log(`[${this.auctioneerName}] Veículo ${index}: ${vehicle.title} - R$ ${vehicle.current_bid || 'N/A'}`);
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

  private isRelevantVehicle(vehicle: VehicleData): boolean {
    // Filtrar veículos relevantes
    if (!vehicle.title || vehicle.title.length < 10) return false;
    if (!vehicle.brand || vehicle.brand === 'Desconhecida') return false;
    if (!vehicle.model || vehicle.model === 'Desconhecido') return false;
    
    // Filtrar por preço (opcional)
    if (vehicle.current_bid && vehicle.current_bid < 1000) return false;
    
    return true;
  }
}
