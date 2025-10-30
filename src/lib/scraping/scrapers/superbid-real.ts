import { Page } from 'playwright';
import { BaseScraper, VehicleData } from '../base-scraper';
import { extractBrandAndModel } from '../brands';

/**
 * Superbid Real Scraper
 * 
 * Scraper confiável para o site Superbid baseado na estrutura real da página
 * - Usa URL correta com pageNumber e pageSize
 * - Seletores CSS específicos e testados
 * - Detecção inteligente de fim de páginas (repetição)
 * - Extração precisa de marca, modelo, cor, ano do título
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
    const seenTitles = new Set<string>(); // Para detectar repetição de títulos

    try {
      console.log(`[${this.auctioneerName}] Iniciando scraping do Superbid...`);
      console.log(`[${this.auctioneerName}] URL base: ${this.baseUrl}`);

      let currentPage = 1;
      let duplicatePageCount = 0;
      const maxDuplicatePages = 2;

      while (currentPage <= 250) { // Limite máximo de segurança
        const pageUrl = `${this.baseUrl}?pageNumber=${currentPage}&pageSize=${this.pageSize}`;
        console.log(`[${this.auctioneerName}] Acessando página ${currentPage}: ${pageUrl}`);

        try {
          await this.page.goto(pageUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          });

          // Aguardar carregamento dos veículos
          await this.page.waitForSelector('.cBkeyd img, .iCGnEw', {
            timeout: 10000
          });

          // Extrair veículos da página atual
          const pageVehicles = await this.scrapePage(currentPage);
          
          if (pageVehicles.length === 0) {
            console.log(`[${this.auctioneerName}] Nenhum veículo encontrado na página ${currentPage}`);
            break;
          }

          // Verificar se é uma página repetida (mesmos títulos)
          const currentTitles = pageVehicles.map(v => v.title).sort();
          const isDuplicatePage = this.isDuplicatePage(currentTitles, seenTitles);
          
          if (isDuplicatePage) {
            duplicatePageCount++;
            console.log(`[${this.auctioneerName}] Página ${currentPage} é duplicada (mesma da página anterior)`);
            
            if (duplicatePageCount >= maxDuplicatePages) {
              console.log(`[${this.auctioneerName}] Muitas páginas duplicadas consecutivas. Parando scraping.`);
              break;
            }
          } else {
            duplicatePageCount = 0; // Reset contador se não é duplicada
          }

          // Filtrar duplicatas e adicionar veículos únicos
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

          // Delay entre páginas
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
      // Aguardar carregamento
      await this.randomDelay(2000, 3000);

      // Encontrar todos os veículos na página
      const vehicleElements = await this.page.$$('.cBkeyd, .iCGnEw').then(elements => {
        // Agrupar elementos por veículo (imagem + título)
        const groups = [];
        for (let i = 0; i < elements.length; i += 2) {
          if (elements[i] && elements[i + 1]) {
            groups.push({
              imageElement: elements[i],
              titleElement: elements[i + 1]
            });
          }
        }
        return groups;
      });

      console.log(`[${this.auctioneerName}] Encontrados ${vehicleElements.length} veículos na página ${pageNumber}`);

      // Processar cada veículo
      for (let i = 0; i < vehicleElements.length; i++) {
        try {
          const vehicle = await this.extractVehicleData(vehicleElements[i], i, pageNumber);

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

  private async extractVehicleData(vehicleGroup: any, index: number, pageNumber: number): Promise<VehicleData | null> {
    try {
      // Extrair título
      const title = await vehicleGroup.titleElement.textContent();
      if (!title || title.trim().length < 5) {
        console.log(`[${this.auctioneerName}] Veículo ${index}: Título inválido (${title})`);
        return null;
      }

      const cleanTitle = title.trim();
      console.log(`[${this.auctioneerName}] Veículo ${index}: Processando "${cleanTitle}"`);

      // Extrair imagem
      const imageUrl = await vehicleGroup.imageElement.querySelector('img')?.getAttribute('src') || '';

      // Extrair marca e modelo do título
      const { brand, model } = this.extractBrandModelFromTitle(cleanTitle);

      // Extrair ano do título
      const year = this.extractYearFromTitle(cleanTitle);

      // Extrair cor do título
      const color = this.extractColorFromTitle(cleanTitle);

      // Extrair localização e ano adicional
      const locationElement = await this.page?.$('.bYTBLg');
      const locationText = await locationElement?.textContent() || '';
      const location = this.extractLocation(locationText);
      const additionalYear = this.extractYearFromText(locationText);

      // Extrair informações de preço e lances
      const priceInfo = await this.extractPriceInfo();

      // Extrair datas e horários
      const auctionInfo = await this.extractAuctionInfo();

      // Gerar ID único
      const externalId = this.generateVehicleId(cleanTitle, priceInfo.currentBid, year || additionalYear);

      const vehicle: VehicleData = {
        external_id: externalId,
        title: cleanTitle,
        brand: brand || 'Desconhecida',
        model: model || 'Desconhecido',
        year_manufacture: year || additionalYear || undefined,
        year_model: year || additionalYear || undefined,
        vehicle_type: this.detectVehicleType(cleanTitle),
        color: color || undefined,
        mileage: this.extractMileageFromTitle(cleanTitle),
        state: location.state || 'SP',
        city: location.city || 'São Paulo',
        current_bid: priceInfo.currentBid,
        minimum_bid: priceInfo.minimumBid,
        auction_date: auctionInfo.auctionDate,
        auction_type: priceInfo.paymentType === 'parcelado' ? 'Parcelado' : 'À vista',
        condition: 'Usado',
        original_url: `${this.baseUrl}?pageNumber=${pageNumber}&pageSize=${this.pageSize}#${index}`,
        thumbnail_url: imageUrl || undefined,
        images: imageUrl ? [imageUrl] : undefined
      };

      console.log(`[${this.auctioneerName}] Veículo ${index}: ${vehicle.title} - R$ ${vehicle.current_bid || 'N/A'}`);
      console.log(`[${this.auctioneerName}] Veículo ${index}: ${vehicle.brand} ${vehicle.model} ${vehicle.year_manufacture || ''}`);
      return vehicle;

    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro ao extrair dados do veículo ${index}:`, error);
      return null;
    }
  }

  private extractBrandModelFromTitle(title: string): { brand: string; model: string } {
    // Usar a função existente e melhorar com regex específico
    const { brand, model } = extractBrandAndModel(title);
    
    // Melhorar extração com regex específico para títulos do Superbid
    const titleLower = title.toLowerCase();
    
    // Padrões comuns no Superbid
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

  private extractLocation(locationText: string): { state: string; city: string } {
    // Extrair estado e cidade do texto de localização
    const stateMatch = locationText.match(/\b([A-Z]{2})\b/);
    const cityMatch = locationText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    
    return {
      state: stateMatch ? stateMatch[1] : 'SP',
      city: cityMatch ? cityMatch[1] : 'São Paulo'
    };
  }

  private extractYearFromText(text: string): number | undefined {
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0], 10);
      return isNaN(year) ? undefined : year;
    }
    return undefined;
  }

  private async extractPriceInfo(): Promise<{ currentBid?: number; minimumBid?: number; paymentType?: string }> {
    try {
      // Extrair valor das praças
      const priceElement = await this.page?.$('.idLmIo');
      const priceText = await priceElement?.textContent() || '';

      // Extrair lance atual
      const currentBidElement = await this.page?.$('.GhSXc');
      const currentBidText = await currentBidElement?.textContent() || '';

      // Extrair tipo de pagamento
      const paymentElement = await this.page?.$('.gTMRAt');
      const paymentText = await paymentElement?.textContent() || '';

      return {
        currentBid: this.extractPrice(currentBidText || priceText),
        minimumBid: this.extractPrice(priceText),
        paymentType: paymentText.toLowerCase().includes('parcelado') ? 'parcelado' : 'vista'
      };
    } catch (error) {
      console.log(`[${this.auctioneerName}] Erro ao extrair informações de preço:`, error);
      return {};
    }
  }

  private async extractAuctionInfo(): Promise<{ auctionDate?: Date }> {
    try {
      // Extrair datas e horários
      const dateElement = await this.page?.$('.dDlHuy');
      const dateText = await dateElement?.textContent() || '';

      // Parsear data (implementar conforme formato específico)
      const auctionDate = this.parseAuctionDate(dateText);

      return { auctionDate };
    } catch (error) {
      console.log(`[${this.auctioneerName}] Erro ao extrair informações de leilão:`, error);
      return {};
    }
  }

  private extractPrice(text: string): number | undefined {
    if (!text) return undefined;
    
    const priceMatch = text.match(/[\d.,]+/);
    if (priceMatch) {
      const priceStr = priceMatch[0].replace(/[.,]/g, '');
      const price = parseFloat(priceStr);
      return isNaN(price) ? undefined : price;
    }
    return undefined;
  }

  private extractMileageFromTitle(title: string): number | undefined {
    const mileageMatch = title.match(/(\d+)\s*km/i);
    if (mileageMatch) {
      const mileage = parseInt(mileageMatch[1], 10);
      return isNaN(mileage) ? undefined : mileage;
    }
    return undefined;
  }

  private parseAuctionDate(dateText: string): Date | undefined {
    // Implementar parsing de data conforme formato específico do Superbid
    // Por enquanto, retornar undefined
    return undefined;
  }

  private generateVehicleId(title: string, currentBid?: number, year?: number): string {
    const baseId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-*|-*$/g, '');
    const priceSuffix = currentBid ? `-${currentBid}` : '';
    const yearSuffix = year ? `-${year}` : '';
    
    return `superbid-real-${baseId}${priceSuffix}${yearSuffix}`;
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
    if (!vehicle.title || vehicle.title.length < 5) {
      console.log(`[${this.auctioneerName}] Veículo rejeitado: título muito curto (${vehicle.title})`);
      return false;
    }
    
    if (!vehicle.brand || vehicle.brand === 'Desconhecida') {
      console.log(`[${this.auctioneerName}] Veículo com marca desconhecida: ${vehicle.title}`);
    }
    
    if (!vehicle.model || vehicle.model === 'Desconhecido') {
      console.log(`[${this.auctioneerName}] Veículo com modelo desconhecido: ${vehicle.title}`);
    }
    
    console.log(`[${this.auctioneerName}] Veículo aceito: ${vehicle.title}`);
    return true;
  }

  private isDuplicatePage(currentTitles: string[], seenTitles: Set<string>): boolean {
    // Verificar se todos os títulos da página atual já foram vistos
    const duplicateCount = currentTitles.filter(title => seenTitles.has(title)).length;
    const duplicatePercentage = duplicateCount / currentTitles.length;
    
    // Se mais de 80% dos títulos são duplicados, é uma página repetida
    return duplicatePercentage > 0.8;
  }
}
