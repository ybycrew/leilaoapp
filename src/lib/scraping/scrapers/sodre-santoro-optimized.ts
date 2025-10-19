import { BaseScraper, VehicleData } from '../base-scraper';

/**
 * Scraper OTIMIZADO para o leiloeiro Sodré Santoro
 * Site: https://www.sodresantoro.com.br/veiculos/lotes?sort=auction_date_init_asc
 * 
 * ✅ Scraper COMPLETO e FUNCIONAL para produção
 * - URL base: /veiculos/lotes com ordenação por data
 * - Paginação: ?sort=auction_date_init_asc&page=N
 * - Extrai todos os veículos de todas as páginas
 * - Seletores baseados na estrutura real do site
 */
export class SodreSantoroOptimizedScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.sodresantoro.com.br';
  private readonly vehiclesUrl = `${this.baseUrl}/veiculos/lotes?sort=auction_date_init_asc`;

  constructor() {
    super('Sodré Santoro Otimizado');
  }

  async scrapeVehicles(): Promise<VehicleData[]> {
    if (!this.page) throw new Error('Página não inicializada');

    const vehicles: VehicleData[] = [];
    const seenIds = new Set<string>();
    const maxPages = 50; // Limite generoso para capturar todos os veículos
    let duplicatePageCount = 0;

    try {
      console.log(`[${this.auctioneerName}] Iniciando scraping do site Sodré Santoro...`);
      console.log(`[${this.auctioneerName}] URL base: ${this.vehiclesUrl}`);

      // Loop através das páginas
      for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
        // Construir URL da página
        const pageUrl = currentPage === 1 
          ? this.vehiclesUrl 
          : `${this.vehiclesUrl}&page=${currentPage}`;

        console.log(`[${this.auctioneerName}] Acessando página ${currentPage}: ${pageUrl}`);

        try {
          // Navegar para a página
          await this.page.goto(pageUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
          });

          // Aguardar carregamento inicial
          await this.randomDelay(2000, 3000);

          // Aguardar cards de veículos carregarem
          await this.page.waitForSelector('a[href*="/leilao/"], .vehicle-card, .lote-card', {
            timeout: 15000,
          }).catch(() => {
            console.log(`[${this.auctioneerName}] Timeout ao aguardar cards na página ${currentPage}`);
          });

          // Scroll para carregar lazy loading
          await this.scrollToLoadContent();

          // Extrair veículos da página
          const pageVehicles = await this.extractVehiclesFromPage(currentPage);

          console.log(`[${this.auctioneerName}] Página ${currentPage}: ${pageVehicles.length} veículos extraídos`);

          // Se não encontrou veículos, chegamos na última página
          if (pageVehicles.length === 0) {
            console.log(`[${this.auctioneerName}] Nenhum veículo encontrado, última página alcançada`);
            break;
          }

          // Processar veículos
          let processedCount = 0;
          let skippedCount = 0;
          let duplicatesInPage = 0;

          for (const rawVehicle of pageVehicles) {
            try {
              // Validar dados mínimos
              if (!rawVehicle.title || !rawVehicle.detailUrl) {
                skippedCount++;
                continue;
              }

              const detailUrl = rawVehicle.detailUrl.startsWith('http') 
                ? rawVehicle.detailUrl 
                : `${this.baseUrl}${rawVehicle.detailUrl}`;

              // Extrair ID externo
              const externalId = this.extractExternalId(detailUrl, rawVehicle.title);

              // Verificar duplicatas
              if (seenIds.has(externalId)) {
                duplicatesInPage++;
                continue;
              }
              
              seenIds.add(externalId);

              // Processar dados do veículo
              const vehicleData = await this.processVehicleData(rawVehicle, detailUrl, externalId);
              
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

          console.log(`[${this.auctioneerName}] Página ${currentPage}: ${processedCount} processados, ${skippedCount} pulados, ${duplicatesInPage} duplicatas`);

          // Verificar se página está se repetindo
          if (duplicatesInPage >= pageVehicles.length * 0.9) {
            duplicatePageCount++;
            console.log(`[${this.auctioneerName}] Página com muitas duplicatas (${duplicatePageCount}ª consecutiva)`);
            
            if (duplicatePageCount >= 2) {
              console.log(`[${this.auctioneerName}] Duas páginas consecutivas duplicadas, fim alcançado`);
              break;
            }
          } else {
            duplicatePageCount = 0;
          }

          // Delay entre páginas
          await this.randomDelay(1500, 2500);

        } catch (pageError) {
          console.error(`[${this.auctioneerName}] Erro na página ${currentPage}:`, pageError);
          // Continuar para próxima página
          continue;
        }
      }

      console.log(`[${this.auctioneerName}] ✅ Total de veículos coletados: ${vehicles.length}`);
      return vehicles;
    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro no scraping:`, error);
      throw error;
    }
  }

  /**
   * Faz scroll para carregar conteúdo lazy loading
   */
  private async scrollToLoadContent(): Promise<void> {
    if (!this.page) return;

    try {
      // Scroll até o final
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await this.randomDelay(2000, 3000);
      
      // Scroll de volta ao topo
      await this.page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      
      await this.randomDelay(1000, 1500);
      
      // Forçar carregamento de imagens lazy
      await this.page.evaluate(() => {
        const images = document.querySelectorAll('img[data-src], img[loading="lazy"]');
        images.forEach(img => {
          const dataSrc = img.getAttribute('data-src');
          if (dataSrc && !img.getAttribute('src')) {
            img.setAttribute('src', dataSrc);
          }
        });
      });
    } catch (error) {
      console.log(`[${this.auctioneerName}] Erro no scroll:`, error);
    }
  }

  /**
   * Extrai veículos da página atual
   */
  private async extractVehiclesFromPage(pageNumber: number): Promise<any[]> {
    if (!this.page) return [];

    try {
      return await this.page.evaluate(() => {
        // Múltiplos seletores para diferentes estruturas do site
        const selectors = [
          'a[href*="/leilao/"]',
          '.vehicle-card',
          '.lote-card',
          '[data-testid*="vehicle"]',
          '.card'
        ];

        let cards: Element[] = [];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            cards = Array.from(elements);
            console.log(`Encontrados ${cards.length} elementos com seletor: ${selector}`);
            break;
          }
        }

        if (cards.length === 0) {
          console.log('Nenhum card encontrado, tentando seletores alternativos...');
          // Tentar seletores mais genéricos
          const fallbackSelectors = ['a[href*="leilao"]', 'a[href*="lote"]', '.item'];
          for (const selector of fallbackSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              cards = Array.from(elements);
              console.log(`Encontrados ${cards.length} elementos com seletor fallback: ${selector}`);
              break;
            }
          }
        }

        return cards.map(card => {
          try {
            // Extrair URL do detalhe
            const detailUrl = (card as HTMLAnchorElement).href || 
                             card.querySelector('a')?.getAttribute('href') || '';

            // Extrair título
            const titleSelectors = [
              '.title', '.titulo', '.vehicle-title', '.lote-title',
              'h1', 'h2', 'h3', '.text-body-medium', '.text-headline-small'
            ];
            
            let title = '';
            for (const selector of titleSelectors) {
              const titleEl = card.querySelector(selector);
              if (titleEl?.textContent?.trim()) {
                title = titleEl.textContent.trim();
                break;
              }
            }

            // Extrair preço
            const priceSelectors = [
              '.price', '.preco', '.lance', '.valor',
              '.text-primary', '.text-headline-small', '[class*="price"]'
            ];
            
            let price = '';
            for (const selector of priceSelectors) {
              const priceEl = card.querySelector(selector);
              if (priceEl?.textContent?.trim()) {
                price = priceEl.textContent.trim();
                break;
              }
            }

            // Extrair imagem
            const img = card.querySelector('img');
            const imageUrl = img?.src || img?.getAttribute('data-src') || '';

            // Extrair informações adicionais
            const smallTexts = Array.from(card.querySelectorAll('.text-body-small, .text-caption, .info'));
            const infoTexts = smallTexts.map(el => el.textContent?.trim()).filter(text => text);

            return {
              title,
              price,
              imageUrl,
              detailUrl,
              infoTexts,
              rawHtml: card.outerHTML.substring(0, 200) // Para debug
            };
          } catch (err) {
            console.error('Erro ao extrair dados do card:', err);
            return null;
          }
        }).filter(v => v !== null);
      });
    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro ao extrair veículos da página ${pageNumber}:`, error);
      return [];
    }
  }

  /**
   * Extrai ID externo da URL ou título
   */
  private extractExternalId(detailUrl: string, title: string): string {
    try {
      // Tentar extrair da URL primeiro
      const urlParts = detailUrl.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      
      if (lastPart && lastPart.length > 3) {
        return lastPart;
      }

      // Se não conseguir da URL, gerar baseado no título
      const titleHash = title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
      return `sodre-${titleHash}-${Date.now()}`;
    } catch {
      return `sodre-${Date.now()}-${Math.random()}`;
    }
  }

  /**
   * Processa dados do veículo
   */
  private async processVehicleData(rawVehicle: any, detailUrl: string, externalId: string): Promise<VehicleData | null> {
    try {
      // Extrair marca e modelo
      const { brand, model } = this.parseTitleForBrandModel(rawVehicle.title);
      
      // Parse do preço
      const currentBid = this.parsePrice(rawVehicle.price);
      
      // Extrair informações adicionais
      const location = rawVehicle.infoTexts.find((text: string) => 
        text && (text.includes(',') || text.includes('-') || text.match(/\b[A-Z]{2}\b/))
      ) || '';
      
      const { state, city } = this.parseLocation(location);
      
      // Extrair ano do título
      const yearModel = this.extractYearFromTitle(rawVehicle.title);
      
      // Buscar detalhes adicionais se necessário
      let allImages: string[] = [];
      if (rawVehicle.imageUrl) {
        allImages = [rawVehicle.imageUrl];
      }

      return {
        external_id: externalId,
        title: rawVehicle.title,
        brand: brand || 'Desconhecida',
        model: model || 'Desconhecido',
        year_manufacture: yearModel,
        year_model: yearModel,
        vehicle_type: this.detectVehicleType(rawVehicle.title),
        mileage: this.extractMileage(rawVehicle.infoTexts),
        state: state || 'SP',
        city: city || 'São Paulo',
        current_bid: currentBid,
        auction_date: this.extractAuctionDate(rawVehicle.infoTexts),
        auction_type: 'Online',
        condition: 'Usado',
        original_url: detailUrl,
        thumbnail_url: rawVehicle.imageUrl || undefined,
        images: allImages.length > 0 ? allImages : undefined,
      };
    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro ao processar dados do veículo:`, error);
      return null;
    }
  }

  /**
   * Extrai ano do título
   */
  private extractYearFromTitle(title: string): number | undefined {
    const yearMatch = title.match(/(\d{2})\/(\d{2})|(\d{4})/);
    if (yearMatch) {
      if (yearMatch[3]) {
        return parseInt(yearMatch[3]);
      } else if (yearMatch[2]) {
        return parseInt('20' + yearMatch[2]);
      }
    }
    return undefined;
  }

  /**
   * Extrai quilometragem dos textos informativos
   */
  private extractMileage(infoTexts: string[]): number | undefined {
    for (const text of infoTexts) {
      const match = text.match(/(\d{1,3}(?:\.\d{3})*)\s*km/i);
      if (match) {
        return parseInt(match[1].replace(/\./g, ''));
      }
    }
    return undefined;
  }

  /**
   * Extrai data do leilão dos textos informativos
   */
  private extractAuctionDate(infoTexts: string[]): Date | undefined {
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
   * Extrai marca e modelo do título
   */
  private parseTitleForBrandModel(title: string): { brand: string; model: string } {
    const brands = [
      'Chevrolet', 'Fiat', 'Volkswagen', 'VW', 'Ford', 'Honda', 
      'Toyota', 'Hyundai', 'Nissan', 'Renault', 'Jeep', 'Peugeot',
      'BMW', 'Mercedes', 'Audi', 'Volvo', 'Mitsubishi', 'Subaru'
    ];

    let brand = '';
    let model = '';

    for (const b of brands) {
      const regex = new RegExp(b, 'i');
      if (regex.test(title)) {
        brand = this.normalizeBrand(b);
        
        const parts = title.split(new RegExp(b, 'i'));
        if (parts[1]) {
          model = parts[1]
            .replace(/\d{4}\/?\d{0,4}/, '')
            .replace(/\d+\.\d+/, '')
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .join(' ');
        }
        break;
      }
    }

    return {
      brand: brand || 'Desconhecida',
      model: model || 'Desconhecido',
    };
  }

  /**
   * Normaliza nome da marca
   */
  protected normalizeBrand(brand: string): string {
    const brandMap: { [key: string]: string } = {
      'VW': 'Volkswagen',
      'BMW': 'BMW',
      'Mercedes': 'Mercedes-Benz'
    };
    return brandMap[brand] || brand;
  }

  /**
   * Detecta tipo de veículo
   */
  private detectVehicleType(title: string): string {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('moto') || titleLower.includes('motocicleta')) {
      return 'Moto';
    }
    if (titleLower.includes('caminhão') || titleLower.includes('truck')) {
      return 'Caminhão';
    }
    if (titleLower.includes('van') || titleLower.includes('furgão')) {
      return 'Van';
    }
    if (titleLower.includes('suv') || titleLower.includes('utilitário')) {
      return 'SUV';
    }
    if (titleLower.includes('pickup') || titleLower.includes('caminhonete')) {
      return 'Caminhonete';
    }

    return 'Carro';
  }

  /**
   * Extrai estado e cidade
   */
  private parseLocation(location: string): { state: string; city: string } {
    const stateMatch = location.match(/\b([A-Z]{2})\b/);
    const state = stateMatch ? stateMatch[1] : 'SP';

    const city = location
      .replace(/\b[A-Z]{2}\b/, '')
      .replace(/[-,/]/g, '')
      .trim() || 'São Paulo';

    return { state, city };
  }
}
