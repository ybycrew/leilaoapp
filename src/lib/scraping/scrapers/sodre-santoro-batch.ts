import { BaseScraper, VehicleData } from '../base-scraper';

/**
 * Scraper em LOTES para o leiloeiro Sodré Santoro
 * Site: https://www.sodresantoro.com.br/veiculos/lotes?sort=auction_date_init_asc
 * 
 * ✅ Scraper INTELIGENTE que coleta TODOS os veículos em lotes
 * - Cada execução coleta 1 lote (3-5 páginas)
 * - Usa offset para não repetir veículos
 * - Coleta todos os veículos ao longo do tempo
 * - Evita timeout do Vercel
 */
export class SodreSantoroBatchScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.sodresantoro.com.br';
  private readonly vehiclesUrl = `${this.baseUrl}/veiculos/lotes?sort=auction_date_init_asc`;

  constructor() {
    super('Sodré Santoro');
  }

  async scrapeVehicles(): Promise<VehicleData[]> {
    if (!this.page) throw new Error('Página não inicializada');

    const vehicles: VehicleData[] = [];
    const seenIds = new Set<string>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Determinar qual lote processar baseado na hora atual
      const currentHour = new Date().getHours();
      const batchNumber = Math.floor(currentHour / 6); // 4 lotes por dia (6h cada)
      const startPage = (batchNumber * 5) + 1; // Cada lote = 5 páginas
      const endPage = startPage + 4; // 5 páginas por lote

      console.log(`[${this.auctioneerName}] Iniciando LOTE ${batchNumber + 1} (páginas ${startPage}-${endPage})...`);
      console.log(`[${this.auctioneerName}] Hora atual: ${currentHour}h - Lote: ${batchNumber + 1}/4`);

      // Loop através das páginas do lote atual
      for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
        const pageUrl = currentPage === 1 
          ? this.vehiclesUrl 
          : `${this.vehiclesUrl}&page=${currentPage}`;

        console.log(`[${this.auctioneerName}] Processando página ${currentPage} do lote ${batchNumber + 1}`);

        try {
          await this.page.goto(pageUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 20000,
          });

          // Aguardar carregamento
          await this.randomDelay(300, 600);

          // Extrair veículos da página
          const pageVehicles = await this.extractVehiclesFromPage();
          
          if (pageVehicles.length === 0) {
            console.log(`[${this.auctioneerName}] Nenhum veículo encontrado na página ${currentPage}`);
            break;
          }

          let processedCount = 0;
          let skippedCount = 0;
          let futureAuctionsCount = 0;

          for (const rawVehicle of pageVehicles) {
            try {
              const detailUrl = this.extractDetailUrl(rawVehicle);
              if (!detailUrl) {
                skippedCount++;
                continue;
              }

              const externalId = this.extractRealExternalId(detailUrl);
              if (!externalId) {
                skippedCount++;
                continue;
              }

              // Verificar duplicatas
              if (seenIds.has(externalId)) {
                skippedCount++;
                continue;
              }
              
              seenIds.add(externalId);

              // Verificar se a data do leilão é futura
              const auctionDate = this.extractAuctionDate(rawVehicle.infoTexts, rawVehicle.auctionDate);
              if (auctionDate && auctionDate < today) {
                skippedCount++;
                continue;
              }

              if (auctionDate) {
                futureAuctionsCount++;
              }

              // Processar dados do veículo
              const vehicleData = await this.processVehicleData(rawVehicle, detailUrl, externalId, auctionDate);
              
              if (vehicleData) {
                vehicles.push(vehicleData);
                processedCount++;
              } else {
                skippedCount++;
              }
            } catch (error) {
              console.error(`[${this.auctioneerName}] Erro ao processar veículo:`, error);
              skippedCount++;
            }
          }

          console.log(`[${this.auctioneerName}] Página ${currentPage}: ${processedCount} processados, ${skippedCount} pulados, ${futureAuctionsCount} leilões futuros`);

          // Saída antecipada se não há leilões futuros
          if (futureAuctionsCount === 0 && currentPage > startPage + 1) {
            console.log(`[${this.auctioneerName}] Nenhum leilão futuro encontrado, finalizando lote`);
            break;
          }

          // Delay entre páginas
          await this.randomDelay(400, 800);

        } catch (pageError) {
          console.error(`[${this.auctioneerName}] Erro na página ${currentPage}:`, pageError);
          continue;
        }
      }

      console.log(`[${this.auctioneerName}] ✅ LOTE ${batchNumber + 1} concluído: ${vehicles.length} veículos`);
      return vehicles;

    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro no scraping em lote:`, error);
      return vehicles;
    }
  }

  /**
   * Extrai veículos da página atual
   */
  private async extractVehiclesFromPage(): Promise<any[]> {
    if (!this.page) return [];

    try {
      // Aguardar cards de veículos carregarem
      const selectorUnion = 'a[href*="/lote/"], .lote-card, .vehicle-card, [data-testid*="vehicle"], a[href*="/leilao/"]';
      await this.page.waitForSelector(selectorUnion, {
        timeout: 10000,
      }).catch(() => {
        console.log(`[${this.auctioneerName}] Timeout ao aguardar cards`);
      });

      await this.scrollToLoadContent();

      // Extrair dados dos veículos
      const vehicles = await this.page.evaluate(() => {
        const vehicleCards = document.querySelectorAll('a[href*="/lote/"], a[href*="/leilao/"]');
        const results: any[] = [];

        vehicleCards.forEach((card, index) => {
          try {
            const href = card.getAttribute('href');
            if (!href) return;

            const titleElement = card.querySelector('h3, h4, .title, .vehicle-title, [class*="title"]');
            const title = titleElement?.textContent?.trim() || '';

            const infoElements = card.querySelectorAll('span, p, div:not([class*="title"])');
            const infoTexts = Array.from(infoElements)
              .map(el => el.textContent?.trim())
              .filter(text => text && text.length > 0 && text.length < 100);

            const imageElement = card.querySelector('img');
            const imageUrl = imageElement?.src || imageElement?.getAttribute('data-src') || '';

            if (title && href) {
              results.push({
                title,
                detailUrl: href.startsWith('http') ? href : `https://www.sodresantoro.com.br${href}`,
                infoTexts,
                imageUrl,
                brand: '',
                model: '',
                auctionDate: '',
              });
            }
          } catch (error) {
            console.error('Erro ao extrair dados do veículo:', error);
          }
        });

        return results;
      });

      console.log(`[${this.auctioneerName}] [page.log] Encontrados ${vehicles.length} elementos com seletor: a[href*="/lote/"]`);
      return vehicles;

    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro ao extrair veículos da página:`, error);
      return [];
    }
  }

  /**
   * Extrai URL de detalhes do veículo
   */
  private extractDetailUrl(rawVehicle: any): string | null {
    return rawVehicle.detailUrl || null;
  }

  /**
   * Extrai ID real do veículo da URL
   */
  private extractRealExternalId(detailUrl: string): string | null {
    // Priorizar /lote/ sobre /leilao/
    const loteMatch = detailUrl.match(/\/lote\/(\d+)/);
    if (loteMatch) {
      return `lote_${loteMatch[1]}`;
    }

    const leilaoMatch = detailUrl.match(/\/leilao\/(\d+)/);
    if (leilaoMatch) {
      return `leilao_${leilaoMatch[1]}`;
    }

    return null;
  }

  /**
   * Extrai data do leilão
   */
  private extractAuctionDate(infoTexts: string[], auctionDateText?: string): Date | undefined {
    if (auctionDateText) {
      const dateMatch = auctionDateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        const fullYear = year.length === 2 ? parseInt('20' + year) : parseInt(year);
        return new Date(fullYear, parseInt(month) - 1, parseInt(day));
      }
    }

    for (const text of infoTexts) {
      const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        const fullYear = year.length === 2 ? parseInt('20' + year) : parseInt(year);
        return new Date(fullYear, parseInt(month) - 1, parseInt(day));
      }
    }
    return undefined;
  }

  /**
   * Processa dados completos do veículo
   */
  private async processVehicleData(
    rawVehicle: any,
    detailUrl: string,
    externalId: string,
    auctionDate?: Date
  ): Promise<VehicleData | null> {
    try {
      const brand = this.normalizeBrand(rawVehicle.brand);
      const model = rawVehicle.model || 'Desconhecido';
      const yearModel = this.extractYear(rawVehicle.title) || this.extractYear(rawVehicle.infoTexts.join(' '));
      const currentBid = this.extractCurrentBid(rawVehicle.infoTexts);
      const mileage = this.extractMileage(rawVehicle.infoTexts);

      return {
        external_id: externalId,
        title: rawVehicle.title,
        brand: brand || 'Desconhecida',
        model: model || 'Desconhecido',
        year_manufacture: yearModel,
        year_model: yearModel,
        vehicle_type: this.detectVehicleType(rawVehicle.title),
        mileage: mileage,
        state: 'SP',
        city: 'São Paulo',
        current_bid: currentBid,
        auction_date: auctionDate,
        auction_type: 'Online',
        condition: 'Usado',
        original_url: detailUrl,
        thumbnail_url: rawVehicle.imageUrl || undefined,
      };
    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro ao processar dados do veículo:`, error);
      return null;
    }
  }

  // Métodos auxiliares
  private normalizeBrand(brand: string): string {
    if (!brand) return '';
    return brand.trim().toLowerCase();
  }

  private extractYear(text: string): number | null {
    const match = text.match(/(\d{4})/);
    return match ? parseInt(match[1]) : null;
  }

  private extractCurrentBid(infoTexts: string[]): number | null {
    for (const text of infoTexts) {
      const match = text.match(/R\$\s*([\d.,]+)/);
      if (match) {
        return parseFloat(match[1].replace(',', '.'));
      }
    }
    return null;
  }

  private extractMileage(infoTexts: string[]): number | null {
    for (const text of infoTexts) {
      const match = text.match(/(\d{1,3}(?:\.\d{3})*)\s*km/i);
      if (match) {
        return parseInt(match[1].replace('.', ''));
      }
    }
    return null;
  }

  private detectVehicleType(title: string): string {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('moto') || lowerTitle.includes('motocicleta')) return 'Moto';
    if (lowerTitle.includes('caminhão') || lowerTitle.includes('caminhao')) return 'Caminhão';
    if (lowerTitle.includes('ônibus') || lowerTitle.includes('onibus')) return 'Ônibus';
    return 'Carro';
  }

  /**
   * Faz scroll para carregar conteúdo lazy loading
   */
  private async scrollToLoadContent(): Promise<void> {
    if (!this.page) return;

    try {
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await this.randomDelay(300, 600);
      
      await this.page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      
      await this.randomDelay(200, 400);
      
      await this.page.evaluate(() => {
        const images = document.querySelectorAll('img[data-src], img[loading="lazy"]');
        images.forEach(img => {
          const dataSrc = img.getAttribute('data-src');
          if (dataSrc) {
            img.src = dataSrc;
          }
        });
      });
    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro no scroll:`, error);
    }
  }
}
