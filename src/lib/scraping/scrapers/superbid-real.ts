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
          // Tentar navegar com timeout maior e ignorar erros de rede
          try {
            await this.page.goto(pageUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 60000,
            });
          } catch (navError: any) {
            // Se der timeout mas a página carregou parcialmente, continuar
            if (navError.message.includes('timeout') || navError.name === 'TimeoutError') {
              console.log(`[${this.auctioneerName}] Timeout na navegação, mas continuando...`);
            } else {
              throw navError;
            }
          }

          // Aguardar um pouco para página processar
          await this.randomDelay(2000, 3000);

          // Fechar modal de cookies se aparecer
          try {
            await this.page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              const acceptBtn = buttons.find(btn => {
                const text = btn.textContent || '';
                return text.includes('Aceitar todos os cookies') || text.includes('Rejeitar todos');
              });
              if (acceptBtn) {
                (acceptBtn as HTMLElement).click();
              }
            });
            await this.randomDelay(1000, 2000);
          } catch (e) {
            // Modal de cookies não encontrado ou já fechado
          }

          // Aguardar pelo seletor principal com múltiplas tentativas e diferentes seletores
          let found = false;
          const selectors = [
            'a[href^="/oferta/"]',
            'a[href*="/oferta/"]',
            'a[href*="oferta"]',
            'a[href^="https://www.superbid.net/oferta/"]',
            'a[href^="https://exchange.superbid.net/oferta/"]',
          ];
          
          for (let attempt = 0; attempt < 8; attempt++) {
            for (const selector of selectors) {
              try {
                const count = await this.page.evaluate((sel) => {
                  return document.querySelectorAll(sel).length;
                }, selector);
                
                if (count > 0) {
                  console.log(`[${this.auctioneerName}] Encontrados ${count} elementos com seletor: ${selector}`);
                  found = true;
                  break;
                }
              } catch (e) {
                // Continuar tentando
              }
            }
            
            if (found) break;
            
            console.log(`[${this.auctioneerName}] Tentativa ${attempt + 1}/8 de aguardar seletores...`);
            
            // Aguardar e verificar estado da página
            await this.randomDelay(3000, 5000);
            
            // Verificar se a página ainda está carregando
            const isLoading = await this.page.evaluate(() => {
              return document.readyState !== 'complete';
            });
            
            if (isLoading) {
              console.log(`[${this.auctioneerName}] Página ainda carregando, aguardando mais...`);
              await this.randomDelay(5000, 8000);
            }
          }

          // Sempre verificar manualmente quantos elementos existem com todos os seletores
          const allCounts = await this.page.evaluate(() => {
            const selectors = [
              'a[href^="/oferta/"]',
              'a[href*="/oferta/"]',
              'a[href*="oferta"]',
              'a[href^="https://www.superbid.net/oferta/"]',
              'a[href^="https://exchange.superbid.net/oferta/"]',
            ];
            
            const counts: Record<string, number> = {};
            selectors.forEach(sel => {
              counts[sel] = document.querySelectorAll(sel).length;
            });
            
            // Também contar todos os links para debug
            counts['totalLinks'] = document.querySelectorAll('a').length;
            counts['readyState'] = document.readyState === 'complete' ? 1 : 0;
            
            return counts;
          });
          
          console.log(`[${this.auctioneerName}] Contagem de elementos:`, JSON.stringify(allCounts, null, 2));
          
          const totalOfertaLinks = Object.entries(allCounts)
            .filter(([key]) => key.includes('oferta'))
            .reduce((sum, [, count]) => sum + (count as number), 0);
          
          if (totalOfertaLinks === 0) {
            // Tentar aguardar mais um pouco e verificar novamente
            console.log(`[${this.auctioneerName}] Nenhum link encontrado, aguardando mais 15 segundos...`);
            await this.randomDelay(15000, 20000);
            
            const countAfterWait = await this.page.evaluate(() => {
              return {
                oferta: document.querySelectorAll('a[href*="oferta"]').length,
                total: document.querySelectorAll('a').length,
                readyState: document.readyState
              };
            });
            
            console.log(`[${this.auctioneerName}] Após espera adicional:`, countAfterWait);
            
            if (countAfterWait.oferta === 0) {
              // Debug: verificar o que há na página
              const pageInfo = await this.page.evaluate(() => {
                return {
                  url: window.location.href,
                  title: document.title,
                  readyState: document.readyState,
                  bodyText: document.body?.textContent?.substring(0, 300) || '',
                  allLinks: Array.from(document.querySelectorAll('a')).slice(0, 20).map(a => ({
                    href: a.getAttribute('href'),
                    text: a.textContent?.substring(0, 50)
                  })),
                  scripts: Array.from(document.querySelectorAll('script')).length,
                  scriptsLoaded: Array.from(document.querySelectorAll('script')).filter(s => s.src).length
                };
              });
              
              console.log(`[${this.auctioneerName}] Debug completo da página:`, JSON.stringify(pageInfo, null, 2));
              
              throw new Error('Nenhum veículo encontrado na página após múltiplas tentativas e espera adicional');
            }
          }
          
          // Aguardar um pouco mais para garantir que JS terminou de renderizar
          await this.randomDelay(3000, 5000);

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
        
        // Usar o seletor correto para encontrar cards - os links são do exchange.superbid.net
        const cards = Array.from(document.querySelectorAll('a[href*="oferta"]'));
        
        cards.forEach((card) => {
          try {
            // Extrair título do alt da imagem
            const img = card.querySelector('img');
            const title = img?.alt?.trim() || '';
            
            if (!title || title.length < 5) return;
            
            // Filtrar títulos que são claramente ícones ou elementos não-veículos
            const titleLower = title.toLowerCase();
            if (titleLower.includes('ícone') || titleLower.includes('icone') || 
                titleLower.includes('cartão de crédito') || titleLower.includes('cartao de credito')) {
              return; // Pular este card
            }
            
            // Extrair link - pode ser absoluto (exchange.superbid.net) ou relativo
            const href = card.getAttribute('href') || '';
            let detailUrl = href;
            if (href.startsWith('http')) {
              detailUrl = href;
            } else if (href.startsWith('/')) {
              detailUrl = `https://www.superbid.net${href}`;
            } else {
              detailUrl = `https://www.superbid.net/${href}`;
            }
            
            // Extrair imagem
            const imageUrl = img?.src || '';
            
            // Pegar todos os parágrafos e texto do card
            const paragraphs = Array.from(card.querySelectorAll('p')).map(p => p.textContent?.trim()).filter(Boolean);
            const fullText = card.textContent || '';
            
            // Extrair preço - procurar em parágrafos primeiro, depois no texto completo
            let price = '';
            const priceParagraph = paragraphs.find(p => p?.includes('R$'));
            if (priceParagraph) {
              const priceMatch = priceParagraph.match(/R\$\s*[\d.,]+/);
              if (priceMatch) {
                price = priceMatch[0];
              }
            } else {
              const priceMatches = fullText.match(/R\$\s*[\d.,]+/);
              if (priceMatches && priceMatches.length > 0) {
                price = priceMatches[0];
              }
            }
            
            // Extrair data do leilão - primeiro parágrafo geralmente tem a data
            let auctionDate = '';
            if (paragraphs.length > 0) {
              const firstPara = paragraphs[0];
              const dateMatch = firstPara?.match(/\d{1,2}\/\d{2}\s*-\s*\d{1,2}:\d{2}/);
              if (dateMatch) {
                auctionDate = dateMatch[0];
              } else {
                // Tentar outro formato
                const dateMatch2 = firstPara?.match(/\d{1,2}\/\d{2}/);
                if (dateMatch2) {
                  auctionDate = dateMatch2[0];
                }
              }
            }
            
            // Se não encontrou nos parágrafos, tentar no texto completo
            if (!auctionDate) {
              const dateMatch = fullText.match(/\d{1,2}\/\d{2}\s*-\s*\d{1,2}:\d{2}/);
              if (dateMatch) {
                auctionDate = dateMatch[0];
              }
            }
            
            // Extrair quilometragem - procurar em parágrafos e texto
            let mileage: number | undefined = undefined;
            const mileageParagraph = paragraphs.find(p => p?.toLowerCase().includes('km'));
            if (mileageParagraph) {
              const mileageMatch = mileageParagraph.match(/(\d{1,3}(?:\.\d{3})*)\s*km/i);
              if (mileageMatch) {
                mileage = parseInt(mileageMatch[1].replace(/\./g, ''), 10);
              }
            } else {
              const mileageMatch = fullText.match(/(\d{1,3}(?:\.\d{3})*)\s*km/i);
              if (mileageMatch) {
                mileage = parseInt(mileageMatch[1].replace(/\./g, ''), 10);
              }
            }
            
            // Extrair tipo de leilão - procurar nos parágrafos e texto
            let auctionType = 'Online';
            const fullTextLower = fullText.toLowerCase();
            if (fullTextLower.includes('tomada de pre') || fullTextLower.includes('tomada de preço')) {
              auctionType = 'Tomada de Preço';
            } else if (fullTextLower.includes('mercado balcão') || fullTextLower.includes('compre já')) {
              auctionType = 'Mercado Balcão';
            } else if (fullTextLower.includes('judicial')) {
              auctionType = 'Judicial';
            } else if (fullTextLower.includes('presencial')) {
              auctionType = 'Presencial';
            }
            
            vehicles.push({
              title,
              detailUrl,
              imageUrl,
              price,
              auctionDate,
              mileage,
              auctionType,
              fullText: fullText.substring(0, 500) // debug
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

      console.log(`[${this.auctioneerName}] Veículo ${index}: ${vehicle.title.substring(0, 60)} | ${vehicle.brand} ${vehicle.model} ${vehicle.year_manufacture || ''} | R$ ${vehicle.current_bid || 'N/A'} | KM: ${vehicle.mileage || 'N/A'} | Data: ${vehicle.auction_date ? vehicle.auction_date.toLocaleDateString('pt-BR') : 'N/A'} | Tipo: ${vehicle.auction_type}`);
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
      // Formato: "dd/mm - HH:mm" ou "dd/mm/yyyy"
      const match = dateString.match(/(\d{1,2})\/(\d{1,2})(?:\s*-\s*\d{1,2}:\d{2})?/);
      if (match) {
        const [, day, month] = match;
        const currentYear = new Date().getFullYear();
        // Assumir ano atual ou próximo se for data futura no próximo ano
        let year = currentYear;
        const parsedDay = parseInt(day);
        const parsedMonth = parseInt(month) - 1;
        const auctionDate = new Date(year, parsedMonth, parsedDay);
        
        // Se a data já passou este ano, pode ser do próximo ano
        if (auctionDate < new Date()) {
          year = currentYear + 1;
        }
        
        return new Date(year, parsedMonth, parsedDay);
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private extractBrandModelFromTitle(title: string): { brand: string; model: string } {
    const { brand, model } = extractBrandAndModel(title);
    const titleLower = title.toLowerCase();
    
    // Casos especiais primeiro
    // Porsche
    if (title.match(/i\/?porsche|porsche/i)) {
      const match = title.match(/(?:i\/)?porsche\s+(\w+)/i);
      if (match) return { brand: 'Porsche', model: match[1].toUpperCase() };
    }
    
    // Land Rover / LR
    if (title.match(/i\/?lr|land\s*rover|lr\s*rrs/i)) {
      const match = title.match(/(?:i\/)?lr\s*rrs\s*(\w+)/i);
      if (match) return { brand: 'Land Rover', model: 'RANGE ROVER SPORT' };
      if (title.match(/land\s*rover/i)) return { brand: 'Land Rover', model: 'RANGE ROVER' };
    }
    
    // Audi Q5, Q7, etc
    if (title.match(/^q\d+|audi\s+q\d+/i)) {
      const match = title.match(/(q\d+)/i);
      if (match) return { brand: 'Audi', model: match[1].toUpperCase() };
    }
    
    // Ford F-250, F-350 (precisa estar no início ou após espaço/barra)
    if (title.match(/\bf-?\d+/i)) {
      const match = title.match(/\b(f-?\d+)/i);
      if (match && !titleLower.includes('ford')) {
        return { brand: 'Ford', model: match[1].toUpperCase() };
      }
    }
    
    // RAM/RAMPAGE ou RAM 1500
    if (title.match(/ram\/?rampage|ram\s+rampage/i)) {
      const match = title.match(/ram\/?rampage\s+(\w+)/i);
      if (match) return { brand: 'RAM', model: match[1].toUpperCase() };
      return { brand: 'RAM', model: 'RAMPAGE' };
    }
    if (title.match(/\bram\s+1500/i)) {
      return { brand: 'RAM', model: '1500' };
    }
    
    // IVECO
    if (title.match(/iveco/i)) {
      const match = title.match(/iveco\s+(\w+)/i);
      if (match) return { brand: 'Iveco', model: match[1].toUpperCase() };
    }
    
    // SCANIA
    if (title.match(/scania/i)) {
      const match = title.match(/scania\/?\s*([a-z0-9]+)/i);
      if (match) return { brand: 'Scania', model: match[1].toUpperCase() };
    }
    
    const brandPatterns = [
      { pattern: /(chevrolet|chev|gm)\s+(\w+)/i, brandName: 'Chevrolet' },
      { pattern: /(ford)\s+(\w+)/i, brandName: 'Ford' },
      { pattern: /(volkswagen|vw|vw\/)\s*(\w+)/i, brandName: 'Volkswagen' },
      { pattern: /(fiat)\s+(\w+)/i, brandName: 'Fiat' },
      { pattern: /(honda)\s*\/(\w+(?:-?\w+)?)/i, brandName: 'Honda' }, // Melhor para HR-V, CG-125
      { pattern: /(honda)\s+(\w+(?:\s+\w+)?)/i, brandName: 'Honda' },
      { pattern: /(toyota)\s*\/(.*?modelo:\s*)?(\w+)/i, brandName: 'Toyota' }, // Para "TOYOTA / Modelo: COROLLA"
      { pattern: /(toyota)\s+(\w+)/i, brandName: 'Toyota' },
      { pattern: /(nissan)\s*\/(\w+)/i, brandName: 'Nissan' },
      { pattern: /(nissan)\s+(\w+)/i, brandName: 'Nissan' },
      { pattern: /(hyundai)\s+(\w+)/i, brandName: 'Hyundai' },
      { pattern: /(peugeot)\s+(\w+)/i, brandName: 'Peugeot' },
      { pattern: /(renault)\s+(\w+)/i, brandName: 'Renault' },
      { pattern: /(citroën|citroen)\s+(\w+)/i, brandName: 'Citroën' },
      { pattern: /(bmw)\s+(\w+(?:\s+\w+)?)/i, brandName: 'BMW' }, // Para "BMW M135I" ou "BMW X6"
      { pattern: /(mercedes|mercedes-benz|m\.?\s*benz)\s+(\w+)/i, brandName: 'Mercedes-Benz' },
      { pattern: /(audi)\s+(\w+)/i, brandName: 'Audi' },
      { pattern: /(volvo)\s+(\w+)/i, brandName: 'Volvo' },
      { pattern: /(yamaha)\s+(\w+)/i, brandName: 'Yamaha' },
      { pattern: /(suzuki)\s+(\w+)/i, brandName: 'Suzuki' },
      { pattern: /(dafra)\s+(\w+)/i, brandName: 'Dafra' },
      { pattern: /(jeep)\s+(\w+)/i, brandName: 'Jeep' },
      { pattern: /(mini)\s+(\w+)/i, brandName: 'MINI' },
    ];

    for (const { pattern, brandName } of brandPatterns) {
      const match = title.match(pattern);
      if (match) {
        // Pegar o último grupo capturado (que geralmente é o modelo)
        const modelPart = match[match.length - 1] || match[1];
        
        // Limpar modelo - remover partes desnecessárias
        let cleanModel = modelPart
          .replace(/\s*modelo:\s*/i, '')
          .replace(/\s*\/.*$/, '') // Remove tudo após barra
          .replace(/\s*ano.*$/i, '') // Remove "ano 2020"
          .trim();
        
        // Limitar tamanho do modelo (geralmente não passa de 3-4 palavras)
        const modelWords = cleanModel.split(/\s+/);
        if (modelWords.length > 4) {
          cleanModel = modelWords.slice(0, 4).join(' ');
        }
        
        return {
          brand: brandName,
          model: cleanModel.toUpperCase() || 'Desconhecido'
        };
      }
    }

    // Fallback: tentar identificar marca por palavras isoladas
    if (titleLower.includes('gol') && !titleLower.includes('volkswagen')) {
      return { brand: 'Volkswagen', model: 'GOL' };
    }
    if (titleLower.includes('fox') && !titleLower.includes('volkswagen')) {
      return { brand: 'Volkswagen', model: 'FOX' };
    }
    if (titleLower.includes('uno') && !titleLower.includes('fiat')) {
      return { brand: 'Fiat', model: 'UNO' };
    }
    if (titleLower.includes('palio') && !titleLower.includes('fiat')) {
      return { brand: 'Fiat', model: 'PALIO' };
    }
    if (titleLower.includes('ka') && !titleLower.includes('ford')) {
      return { brand: 'Ford', model: 'KA' };
    }
    if (titleLower.includes('fiesta') && !titleLower.includes('ford')) {
      return { brand: 'Ford', model: 'FIESTA' };
    }
    if (titleLower.includes('corsa') && !titleLower.includes('chevrolet') && !titleLower.includes('gm')) {
      return { brand: 'Chevrolet', model: 'CORSA' };
    }
    if (titleLower.includes('celta') && !titleLower.includes('chevrolet') && !titleLower.includes('gm')) {
      return { brand: 'Chevrolet', model: 'CELTA' };
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
    
    // Filtrar produtos que claramente não são veículos
    const titleLower = vehicle.title.toLowerCase();
    
    // Filtrar ícones e elementos de interface
    if (titleLower.includes('ícone') || titleLower.includes('icone') || 
        titleLower === 'cartão de crédito' || titleLower === 'cartao de credito' ||
        titleLower.includes('ícone cartão')) {
      console.log(`[${this.auctioneerName}] Filtrando ícone/elemento de interface: ${vehicle.title.substring(0, 50)}`);
      return false;
    }
    
    const excludeKeywords = [
      'chave fixa',
      'anel trava',
      'molas de tensão',
      'acessórios para',
      'produto sem imagem',
      'linha de produção', // Excluir "LOTE 37 LINHA DE PRODUÇÃO DE MOTOS"
      'peças',
      'ferramentas',
      'equipamentos',
    ];
    
    // Filtrar "LOTE" mas só se não parecer veículo (ex: "LOTE 0119: GM/CELTA" deve passar)
    if (titleLower.includes('lote') && !this.looksLikeVehicle(titleLower)) {
      // Se tem "lote" mas não parece veículo, filtrar
      if (!titleLower.match(/(chevrolet|fiat|volkswagen|vw|ford|honda|toyota|gm|carro|moto|veículo)/i)) {
        console.log(`[${this.auctioneerName}] Filtrando item com 'lote' que não parece veículo: ${vehicle.title.substring(0, 50)}`);
        return false;
      }
    }
    
    // Se o título contém palavras que indicam que não é um veículo, filtrar
    for (const keyword of excludeKeywords) {
      if (titleLower.includes(keyword) && !this.looksLikeVehicle(titleLower)) {
        console.log(`[${this.auctioneerName}] Filtrando item que não parece ser veículo: ${vehicle.title.substring(0, 50)}`);
        return false;
      }
    }
    
    // Verificar se tem pelo menos uma marca conhecida no título
    const hasBrand = vehicle.brand && vehicle.brand !== 'Desconhecida';
    const titleHasBrand = this.titleHasVehicleBrand(vehicle.title);
    
    if (!hasBrand && !titleHasBrand) {
      // Se não tem marca e o título não parece ser de veículo, filtrar
      if (!this.looksLikeVehicle(titleLower)) {
        console.log(`[${this.auctioneerName}] Filtrando item sem marca conhecida que não parece veículo: ${vehicle.title.substring(0, 50)}`);
        return false;
      }
    }
    
    return true;
  }

  private looksLikeVehicle(title: string): boolean {
    const vehicleKeywords = [
      'carro', 'moto', 'veículo', 'automóvel', 'caminhão', 'van', 'ônibus',
      'chevrolet', 'fiat', 'volkswagen', 'vw', 'ford', 'honda', 'toyota',
      'hyundai', 'nissan', 'renault', 'jeep', 'peugeot', 'citroën', 'bmw',
      'mercedes', 'audi', 'volvo', 'gm', 'yamaha', 'suzuki', 'kawasaki',
      'ano', 'modelo', 'km', 'quilometragem', 'placa', 'cor', 'combustível'
    ];
    
    return vehicleKeywords.some(keyword => title.includes(keyword));
  }

  private titleHasVehicleBrand(title: string): boolean {
    const brands = [
      'chevrolet', 'fiat', 'volkswagen', 'vw', 'ford', 'honda', 'toyota',
      'hyundai', 'nissan', 'renault', 'jeep', 'peugeot', 'citroën', 'citroen',
      'bmw', 'mercedes', 'audi', 'volvo', 'gm', 'yamaha', 'suzuki', 'dafra',
      'ka', 'gol', 'fox', 'uno', 'palio', 'corsa', 'celta', 'fiesta'
    ];
    
    const titleLower = title.toLowerCase();
    return brands.some(brand => titleLower.includes(brand));
  }

  private isDuplicatePage(currentTitles: string[], seenTitles: Set<string>): boolean {
    const duplicateCount = currentTitles.filter(title => seenTitles.has(title)).length;
    const duplicatePercentage = duplicateCount / currentTitles.length;
    return duplicatePercentage > 0.8;
  }
}
