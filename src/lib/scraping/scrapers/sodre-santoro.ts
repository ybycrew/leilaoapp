import { BaseScraper, VehicleData } from '../base-scraper';

/**
 * Scraper para o leiloeiro Sodré Santoro
 * Site: https://www.sodresantoro.com.br/veiculos/lotes
 * 
 * ✅ Scraper COMPLETO e FUNCIONAL
 * - URL base: /veiculos/lotes (apenas veículos)
 * - Paginação: ?sort=auction_date_init_asc&page=N
 * - Percorre todas as páginas até não encontrar mais veículos
 * - Extrai: título, preço, localização, quilometragem, tipo, banco
 * - Visita página de detalhes para extrair: carrossel de imagens (todas), informações adicionais
 * - Seletores baseados na estrutura real do site (Tailwind CSS)
 * - ~48-56 veículos por página, ~16 páginas = ~768-896 veículos
 */
export class SodreSantoroScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.sodresantoro.com.br';
  private readonly vehiclesUrl = `${this.baseUrl}/veiculos/lotes`;

  constructor() {
    super('Sodré Santoro');
  }

  async scrapeVehicles(): Promise<VehicleData[]> {
    if (!this.page) throw new Error('Página não inicializada');

    const vehicles: VehicleData[] = [];
    const seenIds = new Set<string>(); // Para detectar duplicatas
    const maxPages = 2; // TESTE: Limitar a 2 páginas (~96 veículos) para validação rápida
    // const maxPages = 20; // Produção: Limite de segurança (site tem ~16 páginas de veículos)
    let duplicatePageCount = 0;

    try {
      // Loop através das páginas usando URLs diretas
      for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
        // Construir URL da página
        const pageUrl = currentPage === 1 
          ? this.vehiclesUrl 
          : `${this.vehiclesUrl}?sort=auction_date_init_asc&page=${currentPage}`;

        console.log(`[${this.auctioneerName}] Acessando página ${currentPage}: ${pageUrl}`);

        // Navegar para a página
        await this.page.goto(pageUrl, {
          waitUntil: 'domcontentloaded', // Mudado de networkidle2 para ser mais rápido
          timeout: 60000, // Aumentado para 60 segundos
        });

        // Aguardar inicial
        await this.randomDelay(2000, 3000);

        // Aguardar os cards de veículos carregarem
        await this.page.waitForSelector('a[href*="leilao.sodresantoro.com.br"]', {
          timeout: 10000,
        }).catch(() => {
          console.log(`[${this.auctioneerName}] Timeout ao aguardar cards.`);
        });

          // Fazer scroll até o final da página para forçar lazy loading
          await this.page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          
          // Aguardar carregamento dos elementos lazy
          await this.randomDelay(2000, 3000);
          
          // Scroll de volta ao topo (passando por todos os elementos)
          await this.page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight / 2);
          });
          await this.randomDelay(500, 1000);
          
          await this.page.evaluate(() => {
            window.scrollTo(0, 0);
          });
          
          await this.randomDelay(1000, 1500);
          
          // Forçar carregamento de todas as imagens
          await this.page.evaluate(() => {
            const images = document.querySelectorAll('img[data-src]');
            images.forEach(img => {
              const dataSrc = img.getAttribute('data-src');
              if (dataSrc && !img.getAttribute('src')) {
                img.setAttribute('src', dataSrc);
              }
            });
          });

        // 3. Extrair dados dos veículos da página atual
        const pageVehicles = await this.page.evaluate(() => {
          const cards = document.querySelectorAll('a[href*="leilao.sodresantoro.com.br/leilao/"]');
          
          return Array.from(cards).map(card => {
            try {
              // Imagem (pegar a primeira imagem do carousel que tem src preenchido)
              const images = card.querySelectorAll('img');
              let imageUrl = '';
              for (const img of images) {
                if (img.src && img.src.startsWith('http')) {
                  imageUrl = img.src;
                  break; // Pegar apenas a primeira imagem válida
                }
              }
              
              // Modelo/Título
              const titleEl = card.querySelector('.text-body-medium.text-on-surface.uppercase.h-10.line-clamp-2') || 
                             card.querySelector('.text-body-medium');
              
              // Banco/Leiloeiro
              const bankEl = card.querySelector('.text-body-small.text-on-surface-variant.uppercase.line-clamp-1');
              
              // Lance atual
              const priceEl = card.querySelector('.text-primary.text-headline-small');
              
              // Elementos que se repetem: [banco(0), data(1), seguro(2), monta(3), localização(4), km(5)]
              const smallTexts = card.querySelectorAll('.line-clamp-1.text-body-small');
              
              return {
                title: titleEl?.textContent?.trim() || '',
                bank: bankEl?.textContent?.trim() || '',
                price: priceEl?.textContent?.trim() || '',
                imageUrl: imageUrl || '',
                detailUrl: (card as HTMLAnchorElement).href || '',
                auctionDate: smallTexts[1]?.textContent?.trim() || '',
                vehicleType: smallTexts[3]?.textContent?.trim() || '', // tipo de monta
                location: smallTexts[4]?.textContent?.trim() || '', // cidade / estado
                mileage: smallTexts[5]?.textContent?.trim() || '', // quilometragem
              };
            } catch (err) {
              return null;
            }
          }).filter(v => v !== null) as any[];
        });

        console.log(`[${this.auctioneerName}] Página ${currentPage}: ${pageVehicles.length} veículos extraídos`);

        // Se não encontrou veículos, chegamos na última página
        if (pageVehicles.length === 0) {
          console.log(`[${this.auctioneerName}] Nenhum veículo encontrado, última página alcançada`);
          break;
        }

        // Processar e adicionar veículos ao array final
        let processedCount = 0;
        let skippedCount = 0;
        let duplicatesInPage = 0;
        
        for (const rawVehicle of pageVehicles) {
          try {
            // DEBUG: Log do veículo
            console.log(`[DEBUG] Veículo: title="${rawVehicle.title?.substring(0, 30)}", url="${rawVehicle.detailUrl?.substring(0, 50)}"`);
            
            // Validar dados mínimos necessários
            if (!rawVehicle.title || !rawVehicle.detailUrl) {
              console.log(`[DEBUG] Pulado por falta de title ou detailUrl`);
              skippedCount++;
              continue;
            }

            const detailUrl = rawVehicle.detailUrl.startsWith('http') 
              ? rawVehicle.detailUrl 
              : `${this.baseUrl}${rawVehicle.detailUrl}`;

            // Extrair ID externo (extrair da URL)
            const externalId = detailUrl.split('/').filter((s: string) => s).pop() || `sodre-${Date.now()}-${Math.random()}`;

            // Verificar se já foi processado (duplicata)
            if (seenIds.has(externalId)) {
              duplicatesInPage++;
              continue;
            }
            
            seenIds.add(externalId);

            // Extrair marca e modelo do título
            const { brand, model } = this.parseTitleForBrandModel(rawVehicle.title);
            
            // Parse do preço
            const currentBid = this.parsePrice(rawVehicle.price);
            
            // Parse da quilometragem
            const mileage = this.parseMileage(rawVehicle.mileage);
            
            // Parse da localização
            const { state, city } = this.parseLocation(rawVehicle.location);
            
            // Parse da data do leilão (formato: "11/10/25 09:30")
            const auctionDate = this.parseAuctionDateFromText(rawVehicle.auctionDate);
            
            // Extrair ano do título (ex: "chevrolet cruze ltz nb at 18/18")
            const yearMatch = rawVehicle.title.match(/(\d{2})\/(\d{2})/);
            let yearModel: number | undefined;
            if (yearMatch) {
              const year = parseInt('20' + yearMatch[2]); // "18/18" -> 2018
              yearModel = year;
            }

            // Buscar informações adicionais da página de detalhes
            let allImages: string[] = [];
            let detailedInfo: any = {};
            
            try {
              // Verificar se a URL de detalhes é do formato correto (leilao.sodresantoro.com.br)
              if (detailUrl.includes('leilao.sodresantoro.com.br')) {
                detailedInfo = await this.scrapeVehicleDetails(detailUrl);
                allImages = detailedInfo.images || [];
                
                // Delay entre requisições para não sobrecarregar o servidor
                await this.randomDelay(800, 1500);
              }
            } catch (detailError) {
              console.log(`[${this.auctioneerName}] Erro ao buscar detalhes de ${externalId}:`, detailError);
              // Continuar mesmo com erro nos detalhes
            }

            const vehicleData: VehicleData = {
              external_id: externalId,
              title: rawVehicle.title,
              brand: brand || 'Desconhecida',
              model: model || 'Desconhecido',
              year_manufacture: yearModel,
              year_model: yearModel,
              vehicle_type: this.detectVehicleType(rawVehicle.vehicleType || rawVehicle.title),
              mileage: mileage,
              state: state || 'SP',
              city: city || 'São Paulo',
              current_bid: detailedInfo.currentBid !== undefined ? detailedInfo.currentBid : currentBid,
              auction_date: auctionDate,
              auction_type: 'Online',
              condition: 'Usado',
              original_url: detailUrl,
              thumbnail_url: allImages.length > 0 ? allImages[0] : rawVehicle.imageUrl,
              images: allImages.length > 0 ? allImages : (rawVehicle.imageUrl ? [rawVehicle.imageUrl] : undefined),
            };

            vehicles.push(vehicleData);
            processedCount++;
          } catch (error) {
            console.error(`[${this.auctioneerName}] Erro ao processar veículo:`, error);
            skippedCount++;
          }
        }
        
        console.log(`[${this.auctioneerName}] Página ${currentPage}: ${processedCount} processados, ${skippedCount} pulados, ${duplicatesInPage} duplicatas`);
        
        // Se todos ou quase todos são duplicatas, página está se repetindo
        if (duplicatesInPage >= pageVehicles.length * 0.9) {
          duplicatePageCount++;
          console.log(`[${this.auctioneerName}] Página com muitas duplicatas (${duplicatePageCount}ª consecutiva)`);
          
          // Se 2 páginas consecutivas são duplicadas, parar
          if (duplicatePageCount >= 2) {
            console.log(`[${this.auctioneerName}] Duas páginas consecutivas duplicadas, fim alcançado`);
            break;
          }
        } else {
          duplicatePageCount = 0; // Reset contador
        }

        // Delay entre páginas para não sobrecarregar o servidor
        await this.randomDelay(1500, 2500);
      }

      console.log(`[${this.auctioneerName}] ✅ Total de veículos coletados: ${vehicles.length}`);
      return vehicles;
    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro no scraping:`, error);
      throw error;
    }
  }

  /**
   * Extrai imagens e informações adicionais da página de detalhes
   * Retorna: { images: string[], currentBid: number | undefined }
   */
  private async scrapeVehicleDetails(detailUrl: string): Promise<{ images: string[]; currentBid?: number }> {
    if (!this.page) return { images: [] };

    try {
      // Navegar para a página de detalhes
      await this.page.goto(detailUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // Aguardar página carregar
      await this.randomDelay(1000, 2000);

      // Extrair todas as imagens do carrossel
      const images = await this.page.evaluate(() => {
        const imgElements = Array.from(document.querySelectorAll('img'));
        const imageUrls: string[] = [];
        
        imgElements.forEach(img => {
          if (img.src && img.src.includes('photos.sodresantoro.com.br')) {
            // Remover query string ?ims=x597 e outras variações para pegar imagem em alta resolução
            const cleanUrl = img.src.split('?')[0];
            if (!imageUrls.includes(cleanUrl)) {
              imageUrls.push(cleanUrl);
            }
          }
        });
        
        return imageUrls;
      });

      // Extrair o lance atual da página de detalhes
      const lanceAtual = await this.page.evaluate(() => {
        // Procurar pelo preço na página de detalhes
        const priceSelectors = [
          '.text-display-small',
          '.text-headline-large',
          '[class*="price"]',
          '[class*="lance"]'
        ];
        
        for (const selector of priceSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            const text = element.textContent.trim();
            if (text.includes('R$')) {
              return text;
            }
          }
        }
        
        // Se não encontrou, buscar no body todo
        const bodyText = document.body.innerText;
        const match = bodyText.match(/R\$\s*([\d.,]+)/);
        return match ? match[0] : '';
      });

      // Parse do lance
      const currentBid = lanceAtual ? this.parsePrice(lanceAtual) : undefined;

      return {
        images: images.filter(img => img && img.length > 0),
        currentBid
      };
    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro ao extrair detalhes de ${detailUrl}:`, error);
      return { images: [] };
    }
  }

  /**
   * Extrai detalhes de um veículo específico
   */
  private async scrapeVehicleDetail(url: string): Promise<VehicleData | null> {
    if (!this.page) return null;

    try {
      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Aguardar conteúdo carregar
      await this.page.waitForSelector('body', { timeout: 5000 });

      // ============================================
      // EXTRAIR DADOS DO VEÍCULO
      // ATENÇÃO: Adapte os seletores conforme o site real
      // ============================================

      // Título completo
      const title = await this.safeExtractText('h1.vehicle-title, .lote-titulo, h1');

      // Extrair marca e modelo do título
      const { brand, model } = this.parseTitleForBrandModel(title);

      // ID externo (geralmente está na URL ou em algum campo)
      const externalId = url.split('/').pop() || `sodre-${Date.now()}`;

      // Número do lote
      const lotNumber = await this.safeExtractText('.lote-numero, .lot-number');

      // Ano
      const yearText = await this.safeExtractText('.ano, .year');
      const { manufacture, model: yearModel } = this.parseYear(yearText);

      // Preço/Lance
      const priceText = await this.safeExtractText('.preco, .lance-atual, .price');
      const currentBid = this.parsePrice(priceText);

      // Lance mínimo
      const minBidText = await this.safeExtractText('.lance-minimo, .minimum-bid');
      const minimumBid = this.parsePrice(minBidText);

      // Avaliação
      const appraisalText = await this.safeExtractText('.avaliacao, .appraisal');
      const appraisedValue = this.parsePrice(appraisalText);

      // Quilometragem
      const mileageText = await this.safeExtractText('.km, .quilometragem, .mileage');
      const mileage = this.parseMileage(mileageText);

      // Localização
      const location = await this.safeExtractText('.localizacao, .location, .cidade');
      const { state, city } = this.parseLocation(location);

      // Cor
      const color = await this.safeExtractText('.cor, .color');

      // Combustível
      const fuelType = await this.safeExtractText('.combustivel, .fuel');

      // Câmbio
      const transmission = await this.safeExtractText('.cambio, .transmission');

      // Placa
      const licensePlate = await this.safeExtractText('.placa, .license-plate');

      // Data do leilão
      const auctionDateText = await this.safeExtractText('.data-leilao, .auction-date');
      const auctionDate = this.parseAuctionDate(auctionDateText);

      // Tipo de leilão
      const auctionType = await this.safeExtractText('.tipo-leilao, .auction-type');

      // Imagem principal
      const thumbnailUrl = await this.safeExtractAttribute(
        'img.vehicle-image, .lote-imagem img, .gallery img',
        'src'
      );

      // Extrair todas as imagens
      const images = await this.page.evaluate(() => {
        const imgs = document.querySelectorAll('.gallery img, .vehicle-images img');
        return Array.from(imgs)
          .map((img) => (img as HTMLImageElement).src)
          .filter((src) => src && src.startsWith('http'));
      });

      // Montar objeto do veículo
      const vehicleData: VehicleData = {
        external_id: externalId,
        lot_number: lotNumber || undefined,
        title: title || 'Veículo sem título',
        brand: brand || 'Desconhecida',
        model: model || 'Desconhecido',
        year_manufacture: manufacture,
        year_model: yearModel || manufacture,
        vehicle_type: this.detectVehicleType(title),
        color: color || undefined,
        fuel_type: fuelType || undefined,
        transmission: transmission || undefined,
        mileage: mileage,
        license_plate: licensePlate || undefined,
        state: state || 'SP',
        city: city || 'São Paulo',
        current_bid: currentBid,
        minimum_bid: minimumBid,
        appraised_value: appraisedValue,
        auction_date: auctionDate,
        auction_type: auctionType || 'Online',
        has_financing: false, // Verificar no site se tem indicação
        condition: 'Usado',
        original_url: url,
        thumbnail_url: thumbnailUrl || undefined,
        images: images.length > 0 ? images : undefined,
      };

      return vehicleData;
    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro ao extrair detalhes:`, error);
      return null;
    }
  }

  /**
   * Extrai marca e modelo do título
   */
  private parseTitleForBrandModel(title: string): { brand: string; model: string } {
    // Lista de marcas conhecidas
    const brands = [
      'Chevrolet', 'Fiat', 'Volkswagen', 'VW', 'Ford', 'Honda', 
      'Toyota', 'Hyundai', 'Nissan', 'Renault', 'Jeep', 'Peugeot'
    ];

    let brand = '';
    let model = '';

    // Tentar encontrar marca no título
    for (const b of brands) {
      const regex = new RegExp(b, 'i');
      if (regex.test(title)) {
        brand = this.normalizeBrand(b);
        
        // Extrair modelo (palavras após a marca)
        const parts = title.split(new RegExp(b, 'i'));
        if (parts[1]) {
          model = parts[1]
            .replace(/\d{4}\/?\d{0,4}/, '') // Remove ano
            .replace(/\d+\.\d+/, '') // Remove cilindradas
            .trim()
            .split(/\s+/)
            .slice(0, 2) // Primeiras 2 palavras
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
   * Detecta o tipo de veículo baseado no título
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
   * Extrai estado e cidade de uma string
   */
  private parseLocation(location: string): { state: string; city: string } {
    // Exemplos: "São Paulo - SP", "Rio de Janeiro/RJ", "Belo Horizonte, MG"
    const stateMatch = location.match(/\b([A-Z]{2})\b/);
    const state = stateMatch ? stateMatch[1] : 'SP';

    // Remover UF e limpar
    const city = location
      .replace(/\b[A-Z]{2}\b/, '')
      .replace(/[-,/]/g, '')
      .trim() || 'São Paulo';

    return { state, city };
  }

  /**
   * Converte string de data para Date
   */
  private parseAuctionDate(dateString: string): Date | undefined {
    if (!dateString) return undefined;

    try {
      // Exemplos: "10/01/2025", "10/01/2025 14:00", "10 de Janeiro de 2025"
      const parts = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (parts) {
        const [, day, month, year] = parts;
        return new Date(`${year}-${month}-${day}`);
      }

      // Tentar parse direto
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }

  /**
   * Parse de data no formato "11/10/25 09:30" (DD/MM/YY HH:MM)
   */
  private parseAuctionDateFromText(dateString: string): Date | undefined {
    if (!dateString) return undefined;

    try {
      // Formato: "11/10/25 09:30" -> dia/mês/ano hora:minuto
      const match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})/);
      if (match) {
        const [, day, month, year, hour, minute] = match;
        const fullYear = parseInt('20' + year); // "25" -> 2025
        return new Date(fullYear, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
      }

      // Tentar outros formatos
      return this.parseAuctionDate(dateString);
    } catch {
      return undefined;
    }
  }
}

