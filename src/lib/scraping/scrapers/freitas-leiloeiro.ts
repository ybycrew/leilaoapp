import { BaseScraper, VehicleData } from '../base-scraper';
import { extractBrandAndModel } from '../brands';

/**
 * Scraper para o leiloeiro Freitas Leiloeiro
 * Site: https://www.freitasleiloeiro.com.br
 * 
 * Caracter├¡sticas:
 * - Usa scroll infinito (n├úo tem pagina├º├úo tradicional)
 * - Carrega mais ve├¡culos ao rolar para baixo
 * - Seletores identificados:
 *   - Container: .col-md-9
 *   - Card individual: .mt-3
 *   - Data: .cardLote-data
 *   - T├¡tulo: .cardLote-descVeic
 *   - Valor: .cardLote-vlr
 */
export class FreitasLeiloeiroScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.freitasleiloeiro.com.br';

  constructor() {
    super('Freitas Leiloeiro');
  }

  /**
   * Retorna as categorias de tipo de ve├¡culo com seus mapeamentos
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
        internalType: 'Caminh├Áes e ├önibus',
        tipoLoteId: 7
      }
    ];
  }

  async scrapeVehicles(): Promise<VehicleData[]> {
    if (!this.page) throw new Error('P├ígina n├úo inicializada');

    const allVehicles: VehicleData[] = [];
    const seenIds = new Set<string>();

    try {
      console.log(`[${this.auctioneerName}] Iniciando scraping por categorias...`);

      // Obter categorias de tipo de ve├¡culo
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

          // Adicionar todos os ve├¡culos retornados (j├í foram filtrados por duplicatas no scrapeCategory)
          allVehicles.push(...categoryVehicles);

          console.log(`[${this.auctioneerName}] [${category.internalType}] ${categoryVehicles.length} ve├¡culos encontrados`);
        } catch (error) {
          console.error(`[${this.auctioneerName}] Erro ao processar categoria ${category.internalType}:`, error);
          // Continuar com pr├│xima categoria
        }

        // Delay entre categorias
        if (i < categories.length - 1) {
          await this.randomDelay(2000, 3000);
        }
      }

      console.log(`[${this.auctioneerName}] Scraping conclu├¡do. Total: ${allVehicles.length} ve├¡culos ├║nicos`);
      return allVehicles;

    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro no scraping:`, error);
      throw error;
    }
  }

  /**
   * Scraping de uma categoria espec├¡fica com scroll infinito
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

      // Aguardar conte├║do inicial carregar
      await this.randomDelay(2000, 3000);

      // Aguardar container de ve├¡culos aparecer
      await this.page.waitForSelector('.col-md-9', {
        timeout: 10000,
      }).catch(() => {
        console.log(`[${this.auctioneerName}] Timeout ao aguardar container .col-md-9`);
      });

      // Implementar scroll infinito
      let previousCount = 0;
      let stableCount = 0; // Contador de tentativas sem novos ve├¡culos
      const maxStableAttempts = 3; // Parar ap├│s 3 tentativas sem novos ve├¡culos
      const maxScrolls = 100; // Limite de seguran├ºa

      for (let scrollAttempt = 0; scrollAttempt < maxScrolls; scrollAttempt++) {
        console.log(`[${this.auctioneerName}] [${vehicleType}] Scroll ${scrollAttempt + 1}/${maxScrolls}`);

        // Extrair ve├¡culos da p├ígina atual
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
        console.log(`[${this.auctioneerName}] [${vehicleType}] Total acumulado: ${currentCount} ve├¡culos (${newVehiclesCount} novos neste scroll)`);

        // Verificar se novos ve├¡culos foram carregados
        // Usar newVehiclesCount ao inv├®s de comparar currentCount
        if (newVehiclesCount === 0) {
          stableCount++;
          console.log(`[${this.auctioneerName}] [${vehicleType}] Nenhum novo ve├¡culo (${stableCount}/${maxStableAttempts})`);
          
          if (stableCount >= maxStableAttempts) {
            console.log(`[${this.auctioneerName}] [${vehicleType}] Nenhum novo ve├¡culo ap├│s ${stableCount} tentativas. Finalizando.`);
            break;
          }
        } else {
          stableCount = 0; // Reset contador se encontrou novos ve├¡culos
        }

        previousCount = currentCount;

        // Scroll para baixo para carregar mais ve├¡culos
        await this.scrollToLoadMore();

        // Aguardar novos ve├¡culos carregarem
        await this.randomDelay(2000, 3000);

        // Verificar se h├í indicador de carregamento e aguardar desaparecer
        await this.waitForLoadingToComplete();

        // Verificar se chegou ao final (mensagem de fim aparece) AP├ôS o scroll
        const hasReachedEnd = await this.checkIfReachedEnd();
        if (hasReachedEnd) {
          console.log(`[${this.auctioneerName}] [${vehicleType}] Mensagem de fim detectada ap├│s scroll. Finalizando.`);
          // Extrair ve├¡culos finais que podem ter sido carregados
          const finalVehicles = await this.extractVehiclesFromPage(vehicleType);
          for (const vehicle of finalVehicles) {
            if (vehicle.external_id && !seenIds.has(vehicle.external_id)) {
              seenIds.add(vehicle.external_id);
              vehicles.push(vehicle);
            }
          }
          break;
        }
      }

      return vehicles;

    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro ao fazer scraping da categoria ${vehicleType}:`, error);
      return vehicles; // Retornar o que foi coletado at├® agora
    }
  }

  /**
   * Verifica se chegou ao final da lista (mensagem de fim aparece)
   */
  private async checkIfReachedEnd(): Promise<boolean> {
    if (!this.page) return false;

    try {
      const hasEndMessage = await this.page.evaluate(() => {
        // Verificar se existe o elemento que indica fim da lista
        const endMessage = document.querySelector('.small.text-center.text-secondary');
        return endMessage !== null && endMessage.textContent !== null;
      });

      if (hasEndMessage) {
        const messageText = await this.page.evaluate(() => {
          const endMessage = document.querySelector('.small.text-center.text-secondary');
          return endMessage?.textContent?.trim() || '';
        });
        console.log(`[${this.auctioneerName}] Mensagem de fim detectada: "${messageText}"`);
        return true;
      }

      return false;
    } catch (error) {
      // Se houver erro, continuar normalmente
      return false;
    }
  }

  /**
   * Rola a p├ígina para baixo para acionar o carregamento de mais ve├¡culos
   */
  private async scrollToLoadMore(): Promise<void> {
    if (!this.page) return;

    // Scroll suave at├® o final da p├ígina
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
      // Aguardar um pouco para garantir que o conte├║do carregou
      await this.randomDelay(1000, 1500);

      // Verificar se h├í elementos de loading e aguardar desaparecerem
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
   * Extrai todos os ve├¡culos vis├¡veis na p├ígina atual
   */
  private async extractVehiclesFromPage(vehicleType: string): Promise<VehicleData[]> {
    if (!this.page) return [];

    try {
      const vehicles = await this.page.evaluate((type) => {
        const vehicleCards: any[] = [];
        
        // Buscar apenas cards de ve├¡culos (que cont├¬m .cardLote-descVeic)
        // Isso filtra elementos do formul├írio que tamb├®m t├¬m classe .mt-3
        const container = document.querySelector('.col-md-9');
        if (!container) {
          console.log('Container .col-md-9 n├úo encontrado');
          return [];
        }

        // Encontrar todos os t├¡tulos de ve├¡culos e pegar seus cards pai
        const titleElements = Array.from(container.querySelectorAll('.cardLote-descVeic'));
        const cards = titleElements
          .map(titleEl => titleEl.closest('.mt-3'))
          .filter(Boolean) as HTMLElement[];

        if (cards.length === 0) {
          console.log('Nenhum card de ve├¡culo encontrado');
          return [];
        }

        console.log(`Encontrados ${cards.length} cards de ve├¡culos`);

        cards.forEach((card, index) => {
          try {
            // T├¡tulo do ve├¡culo (.cardLote-descVeic)
            const titleElement = card.querySelector('.cardLote-descVeic span') || 
                                card.querySelector('.cardLote-descVeic');
            const title = titleElement?.textContent?.trim() || '';

            // Valor (.cardLote-vlr)
            const priceElement = card.querySelector('.cardLote-vlr');
            const priceText = priceElement?.textContent?.trim() || '';

            // Data do leil├úo (.cardLote-data)
            const dateElement = card.querySelector('.cardLote-data');
            const dateText = dateElement?.textContent?.trim() || '';

            // Link para detalhes
            const linkElement = card.querySelector('a[href*="LoteDetalhes"]');
            const link = linkElement?.getAttribute('href') || '';

            // Imagem (geralmente n├úo h├í no card da lista, s├│ na p├ígina de detalhes)
            const imgElement = card.querySelector('img');
            const image = imgElement?.getAttribute('src') || 
                         imgElement?.getAttribute('data-src') || 
                         '';

            // Extrair ID da URL (leilaoId e loteNumero)
            let externalId = '';
            if (link) {
              // Formato: /Leiloes/LoteDetalhes?leilaoId=7552&loteNumero=1
              const leilaoMatch = link.match(/leilaoId=(\d+)/);
              const loteMatch = link.match(/loteNumero=(\d+)/);
              if (leilaoMatch && loteMatch) {
                externalId = `freitas-${leilaoMatch[1]}-${loteMatch[1]}`;
              } else {
                // Fallback: tentar outros padr├Áes
                const idMatch = link.match(/[Ll]eilao[\/\-]?(\d+)/) || 
                              link.match(/[Ll]ote[\/\-]?(\d+)/);
                externalId = idMatch ? `freitas-${idMatch[1]}` : '';
              }
            }
            
            if (!externalId) {
              externalId = `freitas-${index}-${Date.now()}`;
            }

            // Extrair informa├º├Áes adicionais do t├¡tulo
            // Formato: "I/GM CLASSIC LIFE, 08/08, PLACA: D__-___0, GASOL/ALC, PRETA"
            let brand = '';
            let model = '';
            let year = '';
            let plate = '';
            let fuel = '';
            let color = '';

            if (title) {
              // Tentar extrair marca/modelo do in├¡cio
              // Formato pode ser: "HONDA/CIVIC TOURING CVT" ou "I/GM CLASSIC LIFE"
              const parts = title.split(',');
              if (parts.length > 0) {
                const firstPart = parts[0].trim();
                // Remover prefixo "I/" se existir
                const cleanFirstPart = firstPart.replace(/^I\//, '');
                // Formato: "GM CLASSIC LIFE" ou "HONDA/CIVIC TOURING CVT"
                const brandModelMatch = cleanFirstPart.match(/^([^\/]+)\/(.+)/);
                if (brandModelMatch) {
                  brand = brandModelMatch[1].trim();
                  model = brandModelMatch[2].trim();
                } else {
                  // Se n├úo tem barra, primeira palavra ├® marca
                  const words = cleanFirstPart.split(' ');
                  if (words.length > 0) {
                    brand = words[0];
                    model = words.slice(1).join(' ');
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

              // Extrair combust├¡vel
              const fuelMatch = title.match(/(GASOL|ETANOL|DIESEL|FLEX|GASOL\/ALC|ALC)/i);
              if (fuelMatch) {
                fuel = fuelMatch[1];
              }

              // Extrair cor (├║ltima parte antes do ponto e v├¡rgula)
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
          // Extrair marca e modelo do t├¡tulo se n├úo foram extra├¡dos
          let brand = vehicle.brand;
          let model = vehicle.model;

          if (!brand || !model) {
            const extracted = extractBrandAndModel(vehicle.title);
            brand = brand || extracted.brand;
            model = model || extracted.model;
          }

          // Parse do pre├ºo
          const price = this.parsePrice(vehicle.price_text || '');

          // Parse da data do leil├úo
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
          console.error(`Erro ao enriquecer ve├¡culo ${vehicle.external_id}:`, error);
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
      console.error(`[${this.auctioneerName}] Erro ao extrair ve├¡culos:`, error);
      return [];
    }
  }

  /**
   * Parse da data do leil├úo
   */
  private parseAuctionDate(dateText: string): Date | undefined {
    if (!dateText) return undefined;

    try {
      // Tentar v├írios formatos de data
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

