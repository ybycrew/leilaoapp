import { BaseScraper, VehicleData } from '../base-scraper';
import { extractBrandAndModel } from '../brands';

/**
 * Scraper para o leiloeiro Freitas Leiloeiro
 * Site: https://www.freitasleiloeiro.com.br
 * 
 * Características:
 * - Usa scroll infinito (não tem paginação tradicional)
 * - Carrega mais veículos ao rolar para baixo
 * - Seletores identificados:
 *   - Container: .col-md-9
 *   - Card individual: .mt-3
 *   - Data: .cardLote-data
 *   - Título: .cardLote-descVeic
 *   - Valor: .cardLote-vlr
 */
export class FreitasLeiloeiroScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.freitasleiloeiro.com.br';

  constructor() {
    super('Freitas Leiloeiro');
  }

  /**
   * Retorna as categorias de tipo de veículo com seus mapeamentos
   */
  private getVehicleTypeCategories(): Array<{ 
    url: string; 
    internalType: string;
    tipoLoteId: number;
  }> {
    return [
      {
        url: `${this.baseUrl}/Leiloes/Pesquisar?Categoria=1&Nome=&TipoLoteId=1&AnoModeloMin=0&AnoModeloMax=0&Condicao=0&PatioId=0&Tag=&FaixaValor=0`,
        internalType: 'Carros',
        tipoLoteId: 1
      },
      {
        url: `${this.baseUrl}/Leiloes/Pesquisar?Categoria=1&Nome=&TipoLoteId=3&AnoModeloMin=0&AnoModeloMax=0&Condicao=0&PatioId=0&Tag=&FaixaValor=0`,
        internalType: 'Motos',
        tipoLoteId: 3
      },
      {
        url: `${this.baseUrl}/Leiloes/Pesquisar?Categoria=1&Nome=&TipoLoteId=7&AnoModeloMin=0&AnoModeloMax=0&Condicao=0&PatioId=0&Tag=&FaixaValor=0`,
        internalType: 'Caminhões e Ônibus',
        tipoLoteId: 7
      }
    ];
  }

  async scrapeVehicles(): Promise<VehicleData[]> {
    if (!this.page) throw new Error('Página não inicializada');

    const allVehicles: VehicleData[] = [];
    const seenIds = new Set<string>();

    try {
      console.log(`[${this.auctioneerName}] Iniciando scraping por categorias...`);

      // Obter categorias de tipo de veículo
      const categories = this.getVehicleTypeCategories();
      console.log(`[${this.auctioneerName}] Total de categorias a processar: ${categories.length}`);

      // Processar cada categoria
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        
        console.log(`[${this.auctioneerName}] Processando categoria ${i + 1}/${categories.length}: ${category.internalType}`);
        console.log(`[${this.auctioneerName}] URL: ${category.url}`);

        try {
          const categoryVehicles = await this.scrapeCategory(
            category.url,
            category.internalType,
            seenIds
          );

          // Adicionar todos os veículos retornados (já foram filtrados por duplicatas no scrapeCategory)
          allVehicles.push(...categoryVehicles);

          console.log(`[${this.auctioneerName}] [${category.internalType}] ${categoryVehicles.length} veículos encontrados`);
        } catch (error) {
          console.error(`[${this.auctioneerName}] Erro ao processar categoria ${category.internalType}:`, error);
          // Continuar com próxima categoria
        }

        // Delay entre categorias
        if (i < categories.length - 1) {
          await this.randomDelay(2000, 3000);
        }
      }

      console.log(`[${this.auctioneerName}] Scraping concluído. Total: ${allVehicles.length} veículos únicos`);
      return allVehicles;

    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro no scraping:`, error);
      throw error;
    }
  }

  /**
   * Scraping de uma categoria específica com scroll infinito
   */
  private async scrapeCategory(
    url: string,
    vehicleType: string,
    seenIds: Set<string>
  ): Promise<VehicleData[]> {
    if (!this.page) return [];

    const vehicles: VehicleData[] = [];

    try {
      console.log(`[${this.auctioneerName}] Acessando ${vehicleType}...`);
      
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Aguardar conteúdo inicial carregar
      await this.randomDelay(2000, 3000);

      // Aguardar container de veículos aparecer
      await this.page.waitForSelector('.col-md-9', {
        timeout: 10000,
      }).catch(() => {
        console.log(`[${this.auctioneerName}] Timeout ao aguardar container .col-md-9`);
      });

      // Implementar scroll infinito
      let previousCount = 0;
      let stableCount = 0; // Contador de tentativas sem novos veículos
      const maxStableAttempts = 3; // Parar após 3 tentativas sem novos veículos
      const maxScrolls = 100; // Limite de segurança

      for (let scrollAttempt = 0; scrollAttempt < maxScrolls; scrollAttempt++) {
        console.log(`[${this.auctioneerName}] [${vehicleType}] Scroll ${scrollAttempt + 1}/${maxScrolls}`);

        // Extrair veículos da página atual
        const currentVehicles = await this.extractVehiclesFromPage(vehicleType);
        
        // Filtrar duplicatas e adicionar novos
        let newVehiclesCount = 0;
        for (const vehicle of currentVehicles) {
          if (vehicle.external_id && !seenIds.has(vehicle.external_id)) {
            seenIds.add(vehicle.external_id);
            vehicles.push(vehicle);
            newVehiclesCount++;
          }
        }

        const currentCount = vehicles.length;
        console.log(`[${this.auctioneerName}] [${vehicleType}] Total acumulado: ${currentCount} veículos (${newVehiclesCount} novos neste scroll)`);

        // Verificar se novos veículos foram carregados
        // Usar newVehiclesCount ao invés de comparar currentCount
        if (newVehiclesCount === 0) {
          stableCount++;
          console.log(`[${this.auctioneerName}] [${vehicleType}] Nenhum novo veículo (${stableCount}/${maxStableAttempts})`);
          
          if (stableCount >= maxStableAttempts) {
            console.log(`[${this.auctioneerName}] [${vehicleType}] Nenhum novo veículo após ${stableCount} tentativas. Finalizando.`);
            break;
          }
        } else {
          stableCount = 0; // Reset contador se encontrou novos veículos
        }

        previousCount = currentCount;

        // Scroll para baixo para carregar mais veículos
        await this.scrollToLoadMore();

        // Aguardar novos veículos carregarem
        await this.randomDelay(2000, 3000);

        // Verificar se há indicador de carregamento e aguardar desaparecer
        await this.waitForLoadingToComplete();
      }

      return vehicles;

    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro ao fazer scraping da categoria ${vehicleType}:`, error);
      return vehicles; // Retornar o que foi coletado até agora
    }
  }

  /**
   * Rola a página para baixo para acionar o carregamento de mais veículos
   */
  private async scrollToLoadMore(): Promise<void> {
    if (!this.page) return;

    // Scroll suave até o final da página
    await this.page.evaluate(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    });

    // Aguardar um pouco para o scroll completar
    await this.randomDelay(800, 1200);

    // Scroll adicional pequeno para garantir que chegou ao final
    await this.page.evaluate(() => {
      window.scrollBy(0, 500);
    });

    await this.randomDelay(500, 800);
  }

  /**
   * Aguarda o indicador de carregamento desaparecer (se existir)
   */
  private async waitForLoadingToComplete(): Promise<void> {
    if (!this.page) return;

    try {
      // Aguardar um pouco para garantir que o conteúdo carregou
      await this.randomDelay(1000, 1500);

      // Verificar se há elementos de loading e aguardar desaparecerem
      await this.page.evaluate(() => {
        const loadingSelectors = [
          '.loading',
          '.spinner',
          '[class*="loading"]',
          '[class*="spinner"]',
          '.loader',
          '[class*="Loader"]'
        ];

        for (const selector of loadingSelectors) {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el instanceof HTMLElement) {
              el.style.display = 'none';
            }
          });
        }
      });
    } catch (error) {
      // Continuar mesmo se houver erro
    }
  }

  /**
   * Extrai todos os veículos visíveis na página atual
   */
  private async extractVehiclesFromPage(vehicleType: string): Promise<VehicleData[]> {
    if (!this.page) return [];

    try {
      const vehicles = await this.page.evaluate((type) => {
        const vehicleCards: any[] = [];
        
        // Seletores identificados
        const cardSelector = '.mt-3';
        const cards = Array.from(document.querySelectorAll(cardSelector));

        if (cards.length === 0) {
          console.log('Nenhum card encontrado com seletor .mt-3');
          return [];
        }

        cards.forEach((card, index) => {
          try {
            // Título do veículo (.cardLote-descVeic)
            const titleElement = card.querySelector('.cardLote-descVeic');
            const title = titleElement?.textContent?.trim() || '';

            // Valor (.cardLote-vlr)
            const priceElement = card.querySelector('.cardLote-vlr');
            const priceText = priceElement?.textContent?.trim() || '';

            // Data do leilão (.cardLote-data)
            const dateElement = card.querySelector('.cardLote-data');
            const dateText = dateElement?.textContent?.trim() || '';

            // Link para detalhes (procurar link dentro do card)
            const linkElement = card.querySelector('a[href*="Leilao"], a[href*="lote"], a[href*="Leiloes"]') || 
                               card.closest('a');
            let link = '';
            if (linkElement) {
              link = linkElement.getAttribute('href') || '';
            }

            // Se não encontrou link, tentar construir a partir do card
            if (!link && card instanceof HTMLElement) {
              const onclick = card.getAttribute('onclick');
              if (onclick) {
                const match = onclick.match(/['"]([^'"]*Leilao[^'"]*)['"]/);
                if (match) {
                  link = match[1];
                }
              }
            }

            // Imagem (procurar img dentro do card)
            const imgElement = card.querySelector('img');
            const image = imgElement?.getAttribute('src') || 
                         imgElement?.getAttribute('data-src') || 
                         '';

            // Extrair ID da URL ou usar índice
            let externalId = '';
            if (link) {
              const idMatch = link.match(/[Ll]eilao[\/\-]?(\d+)/) || 
                            link.match(/[Ll]ote[\/\-]?(\d+)/) ||
                            link.match(/\/(\d+)/);
              externalId = idMatch ? `freitas-${idMatch[1]}` : '';
            }
            
            if (!externalId) {
              // Tentar extrair de atributos data-*
              externalId = card.getAttribute('data-id') || 
                          card.getAttribute('data-lote-id') ||
                          `freitas-${index}-${Date.now()}`;
            }

            // Extrair informações adicionais do título
            // Formato: "I/GM CLASSIC LIFE, 08/08, PLACA: D__-___0, GASOL/ALC, PRETA"
            let brand = '';
            let model = '';
            let year = '';
            let plate = '';
            let fuel = '';
            let color = '';

            if (title) {
              // Tentar extrair marca/modelo do início
              const parts = title.split(',');
              if (parts.length > 0) {
                const firstPart = parts[0].trim();
                // Formato: "I/GM CLASSIC LIFE" ou "FIAT/FIORINO FLEX"
                const brandModelMatch = firstPart.match(/^[^\/]+\/(.+)/);
                if (brandModelMatch) {
                  const brandModel = brandModelMatch[1].trim();
                  const brandModelParts = brandModel.split(' ');
                  if (brandModelParts.length > 0) {
                    brand = brandModelParts[0];
                    model = brandModelParts.slice(1).join(' ');
                  }
                }
              }

              // Extrair ano (formato: 08/08 ou 10/10)
              const yearMatch = title.match(/(\d{2})\/(\d{2})/);
              if (yearMatch) {
                year = `20${yearMatch[2]}`; // Ano modelo
              }

              // Extrair placa
              const plateMatch = title.match(/PLACA:\s*([A-Z0-9\-]+)/i);
              if (plateMatch) {
                plate = plateMatch[1];
              }

              // Extrair combustível
              const fuelMatch = title.match(/(GASOL|ETANOL|DIESEL|FLEX|GASOL\/ALC|ALC)/i);
              if (fuelMatch) {
                fuel = fuelMatch[1];
              }

              // Extrair cor (última parte antes do ponto e vírgula)
              const colorMatch = title.match(/,\s*([A-Z]+);?\s*$/i);
              if (colorMatch) {
                color = colorMatch[1];
              }
            }

            if (title && (link || externalId)) {
              vehicleCards.push({
                external_id: externalId,
                title: title,
                brand: brand || '',
                model: model || '',
                year_model: year ? parseInt(year) : undefined,
                license_plate: plate || undefined,
                fuel_type: fuel || undefined,
                color: color || undefined,
                original_url: link ? (link.startsWith('http') ? link : `https://www.freitasleiloeiro.com.br${link}`) : '',
                thumbnail_url: image ? (image.startsWith('http') ? image : image.startsWith('/') ? `https://www.freitasleiloeiro.com.br${image}` : '') : '',
                vehicle_type: type,
                price_text: priceText,
                date_text: dateText,
                state: '',
                city: '',
              });
            }
          } catch (error) {
            console.error(`Erro ao processar card ${index}:`, error);
          }
        });

        return vehicleCards;
      }, vehicleType);

      // Processar e enriquecer dados
      const enrichedVehicles: VehicleData[] = [];

      for (const vehicle of vehicles) {
        try {
          // Extrair marca e modelo do título se não foram extraídos
          let brand = vehicle.brand;
          let model = vehicle.model;

          if (!brand || !model) {
            const extracted = extractBrandAndModel(vehicle.title);
            brand = brand || extracted.brand;
            model = model || extracted.model;
          }

          // Parse do preço
          const price = this.parsePrice(vehicle.price_text || '');

          // Parse da data do leilão
          const auctionDate = this.parseAuctionDate(vehicle.date_text || '');

          enrichedVehicles.push({
            external_id: vehicle.external_id,
            title: vehicle.title,
            brand: brand || '',
            model: model || '',
            year_model: vehicle.year_model,
            license_plate: vehicle.license_plate,
            fuel_type: vehicle.fuel_type,
            color: vehicle.color,
            vehicle_type: vehicle.vehicle_type,
            original_url: vehicle.original_url,
            thumbnail_url: vehicle.thumbnail_url,
            current_bid: price,
            minimum_bid: price,
            auction_date: auctionDate,
            state: vehicle.state || '',
            city: vehicle.city || '',
          });
        } catch (error) {
          console.error(`Erro ao enriquecer veículo ${vehicle.external_id}:`, error);
          // Adicionar mesmo com erro
          enrichedVehicles.push({
            external_id: vehicle.external_id,
            title: vehicle.title,
            brand: '',
            model: '',
            vehicle_type: vehicle.vehicle_type,
            original_url: vehicle.original_url,
            thumbnail_url: vehicle.thumbnail_url,
            state: '',
            city: '',
          });
        }
      }

      return enrichedVehicles;

    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro ao extrair veículos:`, error);
      return [];
    }
  }

  /**
   * Parse da data do leilão
   */
  private parseAuctionDate(dateText: string): Date | undefined {
    if (!dateText) return undefined;

    try {
      // Tentar vários formatos de data
      // Exemplos: "01/12/2024", "01-12-2024", "01 de dezembro de 2024"
      const dateFormats = [
        /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
        /(\d{2})-(\d{2})-(\d{4})/,  // DD-MM-YYYY
        /(\d{4})-(\d{2})-(\d{2})/,  // YYYY-MM-DD
      ];

      for (const format of dateFormats) {
        const match = dateText.match(format);
        if (match) {
          if (format === dateFormats[0]) {
            // DD/MM/YYYY
            const day = parseInt(match[1]);
            const month = parseInt(match[2]) - 1; // JavaScript months are 0-indexed
            const year = parseInt(match[3]);
            return new Date(year, month, day);
          } else if (format === dateFormats[1]) {
            // DD-MM-YYYY
            const day = parseInt(match[1]);
            const month = parseInt(match[2]) - 1;
            const year = parseInt(match[3]);
            return new Date(year, month, day);
          } else if (format === dateFormats[2]) {
            // YYYY-MM-DD
            const year = parseInt(match[1]);
            const month = parseInt(match[2]) - 1;
            const day = parseInt(match[3]);
            return new Date(year, month, day);
          }
        }
      }

      // Tentar parse direto
      const parsed = new Date(dateText);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch (error) {
      // Ignorar erros de parse
    }

    return undefined;
  }
}

