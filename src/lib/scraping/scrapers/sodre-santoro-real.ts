import { BaseScraper, VehicleData } from '../base-scraper';
import { extractBrandAndModel } from '../brands';

/**
 * Scraper REAL para o leiloeiro Sodré Santoro
 * Site: https://www.sodresantoro.com.br/veiculos/lotes?sort=auction_date_init_asc
 * 
 * ✅ Scraper ESPECÍFICO para o site real do Sodré Santoro
 * - Coleta apenas leilões com datas futuras
 * - Usa IDs reais extraídos das URLs
 * - Seletores baseados na estrutura real do site
 */
export class SodreSantoroRealScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.sodresantoro.com.br';
  private readonly vehiclesUrl = `${this.baseUrl}/veiculos/lotes`;

  constructor() {
    // Nome alinhado com o registro no banco
    super('Sodré Santoro');
  }

  /**
   * Retorna as categorias de tipo de veículo com seus mapeamentos
   * O tipo será definido diretamente pela categoria da URL
   * Agora usando URLs agrupadas com __ (dois underscores) como separador
   */
  private getVehicleTypeCategories(): Array<{ urlCategory: string; internalType: string }> {
    return [
      // Caminhões e ônibus agrupados
      { urlCategory: 'onibus__caminh%C3%B5es__implementos+rod.', internalType: 'Caminhões e Ônibus' },
      // Carros agrupados (inclui carros, utilitários pesados, utilitários leves e van leve)
      { urlCategory: 'carros__utilit.+pesados__utilitarios+leves__van+leve', internalType: 'Carros' },
      // Motos
      { urlCategory: 'motos', internalType: 'Motos' },
    ];
  }

  async scrapeVehicles(): Promise<VehicleData[]> {
    if (!this.page) throw new Error('Página não inicializada');

    const vehicles: VehicleData[] = [];
    const seenIds = new Set<string>();
    const maxPages = 100; // Aumentado para usar recursos do GitHub Actions
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zerar horário para comparar apenas datas

    try {
      console.log(`[${this.auctioneerName}] Iniciando scraping do site Sodré Santoro por categorias...`);
      console.log(`[${this.auctioneerName}] Filtrando apenas leilões com data >= ${today.toISOString().split('T')[0]}`);

      // Obter categorias de tipo de veículo
      const categories = this.getVehicleTypeCategories();
      console.log(`[${this.auctioneerName}] Total de categorias a processar: ${categories.length}`);

      // Loop através das categorias
      for (const category of categories) {
        console.log(`[${this.auctioneerName}] Processando categoria: ${category.urlCategory} → tipo: ${category.internalType}`);
        
        let duplicatePageCount = 0;
        const categoryVehicles: VehicleData[] = [];

        // Loop através das páginas para esta categoria
        for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
          // Construir URL com categoria específica
          const categoryUrl = `${this.vehiclesUrl}?lot_category=${category.urlCategory}&sort=auction_date_init_asc`;
          const pageUrl = currentPage === 1 
            ? categoryUrl 
            : `${categoryUrl}&page=${currentPage}`;

          console.log(`[${this.auctioneerName}] [${category.internalType}] Acessando página ${currentPage}: ${pageUrl}`);

          try {
            await this.page.goto(pageUrl, {
              waitUntil: 'domcontentloaded', // Mais rápido que networkidle0
              timeout: 30000, // Reduzido de 90s para 30s
            });

            // Aguardar apenas o essencial (GitHub Actions tem recursos ilimitados)
            await this.randomDelay(100, 300); // Mínimo para GitHub Actions

            // Aguardar cards de veículos carregarem - usar seletores específicos do Sodré Santoro
            // Priorizar links de lote (granular por veículo) e incluir seletores auxiliares
            const selectorUnion = 'a[href*="/lote/"], .lote-card, .vehicle-card, [data-testid*="vehicle"], a[href*="/leilao/"]';
            await this.page.waitForSelector(selectorUnion, {
              timeout: 10000, // Reduzido de 30s para 10s
            }).catch(() => {
              console.log(`[${this.auctioneerName}] [${category.internalType}] Timeout ao aguardar cards na página ${currentPage}`);
            });

            await this.scrollToLoadContent();

            const pageVehicles = await this.extractVehiclesFromPage(currentPage);

            // Se nada foi encontrado, capture HTML parcial para debug
            if (pageVehicles.length === 0) {
              const snapshot = await this.page.evaluate(() => document.body.innerText.slice(0, 500));
              console.log(`[${this.auctioneerName}] [${category.internalType}] Snapshot de página vazia (500 chars):`, snapshot);
            }

            console.log(`[${this.auctioneerName}] [${category.internalType}] Página ${currentPage}: ${pageVehicles.length} veículos extraídos`);

            if (pageVehicles.length === 0) {
              console.log(`[${this.auctioneerName}] [${category.internalType}] Nenhum veículo encontrado, última página alcançada`);
              break;
            }

            // Processar veículos
            let processedCount = 0;
            let skippedCount = 0;
            let duplicatesInPage = 0;
            let futureAuctionsCount = 0;
            let pastAuctionsCount = 0;
            let vehiclesWithoutDate = 0;

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

                // Extrair ID externo REAL da URL
                const externalId = this.extractRealExternalId(detailUrl);

                // Verificar duplicatas (global entre todas as categorias)
                if (seenIds.has(externalId)) {
                  duplicatesInPage++;
                  continue;
                }
                
                seenIds.add(externalId);

                // Verificar se a data do leilão é passada (excluir apenas leilões anteriores a hoje)
                const auctionDate = this.extractAuctionDate(rawVehicle.infoTexts, rawVehicle.auctionDate);
                
                // CRÍTICO: Detectar veículos sem data (não vendidos, não estão mais em leilão)
                // Quando aparecem veículos sem data, significa que chegamos ao fim dos leilões ativos
                // Após esses, aparecerão leilões já vendidos (datas antigas que reaparecem)
                if (!auctionDate) {
                  vehiclesWithoutDate++;
                  skippedCount++;
                  continue; // Pular veículos sem data - não são leilões ativos
                }
                
                // Normalizar datas para comparar apenas dia/mês/ano (sem horas)
                const todayDateOnly = new Date(today);
                todayDateOnly.setHours(0, 0, 0, 0);
                
                const auctionDateOnly = new Date(auctionDate);
                auctionDateOnly.setHours(0, 0, 0, 0);
                
                // Pular apenas leilões com data anterior a hoje (incluir leilões de hoje)
                if (auctionDateOnly < todayDateOnly) {
                  pastAuctionsCount++;
                  skippedCount++;
                  continue;
                }
                
                // Contar leilões em andamento/futuros (data >= hoje)
                futureAuctionsCount++;

                // Processar dados do veículo com o tipo da categoria
                const vehicleData = await this.processVehicleData(
                  rawVehicle, 
                  detailUrl, 
                  externalId, 
                  auctionDate,
                  category.internalType // Passar tipo da categoria
                );
                
                if (vehicleData) {
                  categoryVehicles.push(vehicleData);
                  processedCount++;
                } else {
                  skippedCount++;
                }
              } catch (error) {
                console.error(`[${this.auctioneerName}] [${category.internalType}] Erro ao processar veículo:`, error);
                skippedCount++;
              }
            }

            const pastAuctionsInfo = pastAuctionsCount > 0 ? `, ${pastAuctionsCount} leilões passados filtrados` : '';
            const withoutDateInfo = vehiclesWithoutDate > 0 ? `, ${vehiclesWithoutDate} sem data (não ativos)` : '';
            console.log(`[${this.auctioneerName}] [${category.internalType}] Página ${currentPage}: ${processedCount} processados, ${skippedCount} pulados, ${duplicatesInPage} duplicatas, ${futureAuctionsCount} leilões em andamento/futuros${pastAuctionsInfo}${withoutDateInfo}`);

            // CRÍTICO: Parar quando encontrar veículos sem data
            // Veículos sem data são não vendidos que não estão mais em leilão
            // Após esses, aparecerão leilões já vendidos (datas antigas que reaparecem)
            if (vehiclesWithoutDate > 0) {
              console.log(`[${this.auctioneerName}] [${category.internalType}] ⚠️ Encontrados ${vehiclesWithoutDate} veículos sem data na página ${currentPage}`);
              console.log(`[${this.auctioneerName}] [${category.internalType}] 🛑 Parando paginação - veículos sem data indicam fim dos leilões ativos`);
              break;
            }

            // Saída antecipada: se não há leilões futuros, para após algumas páginas
            if (futureAuctionsCount === 0 && currentPage > 10) {
              console.log(`[${this.auctioneerName}] [${category.internalType}] Nenhum leilão futuro encontrado na página ${currentPage}, finalizando categoria`);
              break;
            }

            // Verificar se página está se repetindo
            if (duplicatesInPage >= pageVehicles.length * 0.9) {
              duplicatePageCount++;
              console.log(`[${this.auctioneerName}] [${category.internalType}] Página com muitas duplicatas (${duplicatePageCount}ª consecutiva)`);
              
              if (duplicatePageCount >= 2) {
                console.log(`[${this.auctioneerName}] [${category.internalType}] Duas páginas consecutivas duplicadas, finalizando categoria`);
                break;
              }
            } else {
              duplicatePageCount = 0;
            }

            // Delay entre páginas (mínimo para GitHub Actions)
            await this.randomDelay(100, 200);

          } catch (pageError) {
            console.error(`[${this.auctioneerName}] [${category.internalType}] Erro na página ${currentPage}:`, pageError);
            continue;
          }
        }

        console.log(`[${this.auctioneerName}] [${category.internalType}] ✅ Categoria concluída: ${categoryVehicles.length} veículos coletados`);
        vehicles.push(...categoryVehicles);
        
        // Delay entre categorias
        await this.randomDelay(500, 1000);
      }

      console.log(`[${this.auctioneerName}] ✅ Total de veículos coletados: ${vehicles.length}`);
      return vehicles;
    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro no scraping:`, error);
      throw error;
    }
  }

  /**
   * Extrai ID externo REAL da URL do Sodré Santoro
   */
  private extractRealExternalId(detailUrl: string): string {
    try {
      // Primeiro tentar ID de LOTE: /lote/{ID}
      let match = detailUrl.match(/\/lote\/([^\/\?]+)/);
      if (match && match[1]) {
        return match[1];
      }

      // Depois tentar ID de leilão: /leilao/{ID}
      match = detailUrl.match(/\/leilao\/([^\/\?]+)/);
      if (match && match[1]) {
        return match[1]; // Retorna o ID real extraído da URL
      }

      // Fallback: tentar extrair da última parte da URL
      const urlParts = detailUrl.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      
      if (lastPart && lastPart.length > 3 && !lastPart.includes('?')) {
        return lastPart;
      }

      // Se não conseguir extrair ID real, usar hash do título
      console.warn(`[${this.auctioneerName}] Não foi possível extrair ID real da URL: ${detailUrl}`);
      return `sodre-real-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    } catch {
      return `sodre-real-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
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
      
      await this.randomDelay(200, 400); // Mínimo para GitHub Actions
      
      await this.page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      
      await this.randomDelay(100, 200); // Mínimo para GitHub Actions
      
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
   * Extrai veículos da página atual com seletores específicos do Sodré Santoro
   */
  private async extractVehiclesFromPage(pageNumber: number): Promise<any[]> {
    if (!this.page) return [];

    try {
      return await this.page.evaluate(() => {
        // Seletores específicos baseados na estrutura real do site Sodré Santoro
        // Priorizar seletores que apontam para o detalhe do LOTE (1 veículo por link)
        const selectors = [
          'a[href*="/lote/"]',
          '.lote-card a[href]',
          '.vehicle-card a[href]',
          '[data-testid*="vehicle"] a[href]',
          'a[href*="/veiculo/"]',
          'a[href*="/leilao/"]'
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
          const fallbackSelectors = ['a[href*="leilao"]', 'a[href*="lote"]', '.item', 'article', 'li'];
          for (const selector of fallbackSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              cards = Array.from(elements);
              console.log(`Encontrados ${cards.length} elementos com seletor fallback: ${selector}`);
              break;
            }
          }
        }

        const seenHrefs = new Set<string>();
        return cards.map(card => {
          try {
            // Extrair URL do detalhe
            let href = (card as HTMLAnchorElement).href || card.querySelector('a')?.getAttribute('href') || '';
            if (!href) return null;

            // Normalizar href relativo
            if (!href.startsWith('http')) {
              const a = document.createElement('a');
              a.href = href;
              href = a.pathname + a.search;
            }

            // Dedupe por href na própria página
            if (seenHrefs.has(href)) return null;
            seenHrefs.add(href);

            const detailUrl = href;

            // Extrair título - seletores específicos do Sodré Santoro
            const titleSelectors = [
              '.text-body-medium.text-on-surface.uppercase.h-10.line-clamp-2',
              '.text-body-medium',
              '.title', '.titulo', '.vehicle-title', '.lote-title',
              'h1', 'h2', 'h3', '.text-headline-small'
            ];
            
            let title = '';
            for (const selector of titleSelectors) {
              const titleEl = card.querySelector(selector);
              if (titleEl?.textContent?.trim()) {
                title = titleEl.textContent.trim();
                break;
              }
            }

            // Extrair preço - seletores específicos do Sodré Santoro
            const priceSelectors = [
              '.text-primary.text-headline-small',
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

            // Extrair informações adicionais - formato específico do Sodré Santoro
            const smallTexts = Array.from(card.querySelectorAll('.line-clamp-1.text-body-small, .text-body-small, .text-caption, .info'));
            const infoTexts = smallTexts.map(el => el.textContent?.trim()).filter(text => text);

            // Extrair data do leilão - geralmente está nos smallTexts
            let auctionDate = '';
            for (const text of infoTexts) {
              if (text && text.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)) {
                auctionDate = text;
                break;
              }
            }

            return {
              title,
              price,
              imageUrl,
              detailUrl,
              infoTexts,
              auctionDate,
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
   * Processa dados do veículo com filtro de data
   * @param vehicleType - Tipo do veículo vindo da categoria da URL (fonte verdadeira)
   */
  private async processVehicleData(
    rawVehicle: any, 
    detailUrl: string, 
    externalId: string, 
    auctionDate?: Date,
    vehicleType?: string
  ): Promise<VehicleData | null> {
    try {
      // Usar a nova função híbrida para extrair marca e modelo
      const { brand, model } = extractBrandAndModel(rawVehicle.title);
      
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

      // Usar tipo da categoria diretamente (sem normalização ou detecção)
      const finalVehicleType = vehicleType || 'Carros'; // Fallback apenas se não fornecido
      
      console.log(`[${this.auctioneerName}] Tipo atribuído: ${finalVehicleType} (origem: categoria URL)`);

      return {
        external_id: externalId,
        title: rawVehicle.title,
        brand: brand || 'Desconhecida',
        model: model || 'Desconhecido',
        year_manufacture: yearModel,
        year_model: yearModel,
        vehicle_type: finalVehicleType,
        mileage: this.extractMileage(rawVehicle.infoTexts),
        state: state || 'SP',
        city: city || 'São Paulo',
        current_bid: currentBid,
        auction_date: auctionDate,
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
   * Extrai data do leilão dos textos informativos
   */
  private extractAuctionDate(infoTexts: string[], auctionDateText?: string): Date | undefined {
    // Primeiro tentar o texto específico da data
    if (auctionDateText) {
      const dateMatch = auctionDateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        const fullYear = year.length === 2 ? parseInt('20' + year) : parseInt(year);
        return new Date(fullYear, parseInt(month) - 1, parseInt(day));
      }
    }

    // Depois tentar nos textos informativos
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
