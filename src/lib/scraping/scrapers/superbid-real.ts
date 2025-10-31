import { BaseScraper, VehicleData } from '../base-scraper';
import { extractBrandAndModel } from '../brands';

/**
 * Superbid Real Scraper
 * 
 * Scraper confiável para o site Superbid baseado na estrutura real da página
 * - Usa URL correta com pageNumber e pageSize
 * - Seletores CSS específicos e testados
 * - Detecção inteligente de fim de páginas (repetição)
 * - Extração completa de dados (imagens, preços, datas, km)
 */
export class SuperbidRealScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.superbid.net/categorias/carros-motos';
  private readonly pageSize = 60;

  constructor() {
    super('Superbid Real');
  }

  async scrapeVehicles(): Promise<VehicleData[]> {
    if (!this.page) throw new Error('Página não inicializada');

    const vehicles: VehicleData[] = [];
    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();

    try {
      console.log(`[${this.auctioneerName}] Iniciando scraping do Superbid...`);
      console.log(`[${this.auctioneerName}] URL base: ${this.baseUrl}`);

      let currentPage = 1;
      let duplicatePageCount = 0;
      const maxDuplicatePages = 2;

      while (currentPage <= 250) {
        const pageUrl = `${this.baseUrl}?pageNumber=${currentPage}&pageSize=${this.pageSize}`;
        console.log(`[${this.auctioneerName}] Acessando página ${currentPage}: ${pageUrl}`);

        try {
          await this.page.goto(pageUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          });

          await this.page.waitForSelector('.cBkeyd img, .iCGnEw', {
            timeout: 10000
          });

          const pageVehicles = await this.scrapePage(currentPage);
          
          if (pageVehicles.length === 0) {
            console.log(`[${this.auctioneerName}] Nenhum veículo encontrado na página ${currentPage}`);
            break;
          }

          const currentTitles = pageVehicles.map(v => v.title).sort();
          const isDuplicatePage = this.isDuplicatePage(currentTitles, seenTitles);
          
          if (isDuplicatePage) {
            duplicatePageCount++;
            console.log(`[${this.auctioneerName}] Página ${currentPage} é duplicada`);
            
            if (duplicatePageCount >= maxDuplicatePages) {
              console.log(`[${this.auctioneerName}] Muitas páginas duplicadas consecutivas. Parando scraping.`);
              break;
            }
          } else {
            duplicatePageCount = 0;
          }

          let newVehiclesCount = 0;
          for (const vehicle of pageVehicles) {
            if (!seenIds.has(vehicle.external_id)) {
              seenIds.add(vehicle.external_id);
              seenTitles.add(vehicle.title);
              vehicles.push(vehicle);
              newVehiclesCount++;
            }
          }

          console.log(`[${this.auctioneerName}] Página ${currentPage}: ${pageVehicles.length} veículos encontrados, ${newVehiclesCount} novos`);

          await this.randomDelay(1000, 2000);
          currentPage++;

        } catch (pageError) {
          console.error(`[${this.auctioneerName}] Erro na página ${currentPage}:`, pageError);
          currentPage++;
          continue;
        }
      }

      console.log(`[${this.auctioneerName}] Scraping do Superbid concluído. Total de veículos: ${vehicles.length}`);
      return vehicles;
    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro geral no scraping do Superbid:`, error);
      throw error;
    }
  }

  private async scrapePage(pageNumber: number): Promise<VehicleData[]> {
    if (!this.page) return [];

    const vehicles: VehicleData[] = [];

    try {
      await this.randomDelay(2000, 3000);

      // Extrair todos os dados de uma vez usando evaluate
      const extractedVehicles = await this.page.evaluate(() => {
        const vehicles: any[] = [];
        
        const titleElements = Array.from(document.querySelectorAll('.iCGnEw'));
        
        titleElements.forEach((titleEl, index) => {
          try {
            // Encontrar o card container
            let card = titleEl.closest('a') || titleEl.parentElement?.parentElement?.parentElement || titleEl.parentElement;
            
            if (!card) return;
            
            const title = titleEl.textContent?.trim() || '';
            if (!title || title.length < 5) return;
            
            // Extrair link
            const linkEl = card as HTMLElement;
            const href = linkEl.getAttribute('href') || (card.querySelector('a')?.getAttribute('href'));
            const detailUrl = href?.startsWith('http') ? href : `https://www.superbid.net${href || ''}`;
            
            // Extrair imagem
            const img = card.querySelector('img');
            const imageUrl = img?.src || img?.getAttribute('src') || img?.getAttribute('data-src') || '';
            
            // Extrair preço
            let price = '';
            const priceSelectors = [
              '.cBkeyd span',
              '.price',
              '[class*="preco"]',
              '[class*="valor"]',
              '[class*="lance"]',
              'span[class*="text"]'
            ];
            
            for (const selector of priceSelectors) {
              const priceEl = card.querySelector(selector);
              if (priceEl?.textContent?.trim() && (priceEl.textContent.includes('R$') || priceEl.textContent.includes('Consultar'))) {
                price = priceEl.textContent.trim();
                break;
              }
            }
            
            // Extrair informações adicionais
            const infoElements = card.querySelectorAll('.text-body-small, .text-caption, [class*="info"], [class*="caption"]');
            const infoTexts: string[] = [];
            infoElements.forEach(el => {
              const text = el.textContent?.trim();
              if (text && text.length > 0) infoTexts.push(text);
            });
            
            // Extrair data do leilão
            let auctionDate = '';
            for (const text of infoTexts) {
              const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
              if (dateMatch) {
                auctionDate = text;
                break;
              }
            }
            
            // Extrair quilometragem
            let mileage: number | undefined = undefined;
            for (const text of infoTexts) {
              const mileageMatch = text.match(/(\d{1,3}(?:\.\d{3})*)\s*km/i);
              if (mileageMatch) {
                mileage = parseInt(mileageMatch[1].replace(/\./g, ''));
                break;
              }
            }
            
            // Extrair tipo de leilão
            let auctionType = 'Online';
            for (const text of infoTexts) {
              if (text.toLowerCase().includes('presencial') || text.toLowerCase().includes('offline')) {
                auctionType = 'Presencial';
                break;
              }
            }
            
            vehicles.push({
              title,
              detailUrl,
              imageUrl,
              price,
              infoTexts,
              auctionDate,
              mileage,
              auctionType
            });
          } catch (error) {
            console.error('Erro ao extrair veículo:', error);
          }
        });
        
        return vehicles;
      });
      
      console.log(`[${this.auctioneerName}] Encontrados ${extractedVehicles.length} veículos na página ${pageNumber}`);
      
      // Processar veículos extraídos
      for (let i = 0; i < extractedVehicles.length; i++) {
        try {
          const vehicle = this.processExtractedVehicle(extractedVehicles[i], i, pageNumber);
          if (vehicle && this.isRelevantVehicle(vehicle)) {
            vehicles.push(vehicle);
          }
        } catch (error) {
          console.error(`[${this.auctioneerName}] Erro ao processar veículo ${i}:`, error);
        }
      }

    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro durante o scraping da página ${pageNumber}:`, error);
    }

    return vehicles;
  }

  private processExtractedVehicle(rawVehicle: any, index: number, pageNumber: number): VehicleData | null {
    try {
      const cleanTitle = rawVehicle.title.trim();
      if (!cleanTitle || cleanTitle.length < 5) {
        return null;
      }

      const { brand, model } = this.extractBrandModelFromTitle(cleanTitle);
      const year = this.extractYearFromTitle(cleanTitle);
      const color = this.extractColorFromTitle(cleanTitle);

      // Parse preço
      const currentBid = rawVehicle.price ? this.parsePrice(rawVehicle.price) : undefined;

      // Parse data
      const auctionDate = rawVehicle.auctionDate ? this.parseAuctionDate(rawVehicle.auctionDate) : undefined;

      // ID externo
      const externalId = this.extractExternalIdFromUrl(rawVehicle.detailUrl, cleanTitle, year);

      // Imagens
      const images: string[] = [];
      if (rawVehicle.imageUrl) {
        images.push(rawVehicle.imageUrl);
      }

      const vehicle: VehicleData = {
        external_id: externalId,
        title: cleanTitle,
        brand: brand || 'Desconhecida',
        model: model || 'Desconhecido',
        year_manufacture: year || undefined,
        year_model: year || undefined,
        vehicle_type: this.detectVehicleType(cleanTitle),
        color: color || undefined,
        mileage: rawVehicle.mileage || undefined,
        state: 'SP',
        city: 'São Paulo',
        current_bid: currentBid,
        minimum_bid: undefined,
        auction_date: auctionDate,
        auction_type: rawVehicle.auctionType || 'Online',
        condition: 'Usado',
        original_url: rawVehicle.detailUrl || `${this.baseUrl}?pageNumber=${pageNumber}&pageSize=${this.pageSize}#${index}`,
        thumbnail_url: rawVehicle.imageUrl || undefined,
        images: images.length > 0 ? images : undefined
      };

      console.log(`[${this.auctioneerName}] Veículo ${index}: ${vehicle.title} - ${vehicle.brand} ${vehicle.model} ${vehicle.year_manufacture || ''} - R$ ${vehicle.current_bid || 'N/A'}`);
      return vehicle;

    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro ao processar veículo ${index}:`, error);
      return null;
    }
  }

  private extractExternalIdFromUrl(url: string, title: string, year?: number): string {
    try {
      const match = url.match(/\/([a-f0-9-]{36}|\d+)$/);
      if (match && match[1]) {
        return `superbid-${match[1]}`;
      }

      const baseId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-*|-*$/g, '');
      const yearSuffix = year ? `-${year}` : '';
      return `superbid-${baseId}${yearSuffix}`;
    } catch {
      return `superbid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  private parseAuctionDate(dateString: string): Date | undefined {
    try {
      const match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (match) {
        const [, day, month, year] = match;
        const fullYear = year.length === 2 ? parseInt('20' + year) : parseInt(year);
        return new Date(fullYear, parseInt(month) - 1, parseInt(day));
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private extractBrandModelFromTitle(title: string): { brand: string; model: string } {
    const { brand, model } = extractBrandAndModel(title);
    const titleLower = title.toLowerCase();
    
    const brandPatterns = [
      /(chevrolet|chev|gm)\s+(\w+)/i,
      /(ford)\s+(\w+)/i,
      /(volkswagen|vw)\s+(\w+)/i,
      /(fiat)\s+(\w+)/i,
      /(honda)\s+(\w+)/i,
      /(toyota)\s+(\w+)/i,
      /(nissan)\s+(\w+)/i,
      /(hyundai)\s+(\w+)/i,
      /(peugeot)\s+(\w+)/i,
      /(renault)\s+(\w+)/i,
      /(citroën|citroen)\s+(\w+)/i,
      /(bmw)\s+(\w+)/i,
      /(mercedes|mercedes-benz)\s+(\w+)/i,
      /(audi)\s+(\w+)/i,
      /(volvo)\s+(\w+)/i
    ];

    for (const pattern of brandPatterns) {
      const match = title.match(pattern);
      if (match) {
        return {
          brand: match[1].toUpperCase(),
          model: match[2].toUpperCase()
        };
      }
    }

    return { brand: brand || 'Desconhecida', model: model || 'Desconhecido' };
  }

  private extractYearFromTitle(title: string): number | undefined {
    const yearMatch = title.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0], 10);
      return isNaN(year) ? undefined : year;
    }
    return undefined;
  }

  private extractColorFromTitle(title: string): string | undefined {
    const colors = [
      'branco', 'preto', 'prata', 'cinza', 'azul', 'vermelho', 'verde', 'amarelo',
      'marrom', 'bege', 'dourado', 'laranja', 'roxo', 'rosa', 'creme'
    ];
    
    const titleLower = title.toLowerCase();
    for (const color of colors) {
      if (titleLower.includes(color)) {
        return color.charAt(0).toUpperCase() + color.slice(1);
      }
    }
    return undefined;
  }

  private detectVehicleType(title: string): string {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('moto') || titleLower.includes('motocicleta') || titleLower.includes('bike')) {
      return 'Moto';
    } else if (titleLower.includes('caminhão') || titleLower.includes('caminhao') || titleLower.includes('truck')) {
      return 'Caminhão';
    } else if (titleLower.includes('ônibus') || titleLower.includes('onibus') || titleLower.includes('bus')) {
      return 'Ônibus';
    } else if (titleLower.includes('van') || titleLower.includes('furgão') || titleLower.includes('furgao')) {
      return 'Van';
    } else {
      return 'Carro';
    }
  }

  private isRelevantVehicle(vehicle: VehicleData): boolean {
    if (!vehicle.title || vehicle.title.length < 5) {
      return false;
    }
    
    return true;
  }

  private isDuplicatePage(currentTitles: string[], seenTitles: Set<string>): boolean {
    const duplicateCount = currentTitles.filter(title => seenTitles.has(title)).length;
    const duplicatePercentage = duplicateCount / currentTitles.length;
    return duplicatePercentage > 0.8;
  }
}
