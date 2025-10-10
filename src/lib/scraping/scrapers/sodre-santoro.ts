import { BaseScraper, VehicleData } from '../base-scraper';

/**
 * Scraper para o leiloeiro Sodré Santoro
 * Site: https://www.sodresantoro.com.br/veiculos/lotes
 * 
 * ✅ Scraper PRONTO e FUNCIONAL
 * - URL base: /veiculos/lotes (apenas veículos)
 * - Paginação: ?sort=auction_date_init_asc&page=N
 * - Percorre todas as páginas até não encontrar mais veículos
 * - Extrai: título, preço, localização, quilometragem, tipo, banco, imagens
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
    const maxPages = 20; // Limite de segurança (site tem ~16 páginas de veículos)
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
          waitUntil: 'networkidle2',
          timeout: 30000,
        });

        // Aguardar inicial
        await this.randomDelay(2000, 3000);

        // Aguardar os cards de veículos carregarem (apenas links)
        await this.page.waitForSelector('a.wrapper.relative.rounded-medium', {
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
        
        // Scroll de volta ao topo
        await this.page.evaluate(() => {
          window.scrollTo(0, 0);
        });
        
        await this.randomDelay(1000, 1500);

        // 3. Extrair dados dos veículos da página atual
        const pageVehicles = await this.page.evaluate(() => {
          const cards = document.querySelectorAll('a.wrapper.relative.rounded-medium');
          
          return Array.from(cards).map(card => {
            try {
              // Imagem
              const imageEl = card.querySelector('img.block.w-full.h-full') as HTMLImageElement;
              
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
                imageUrl: imageEl?.src || imageEl?.getAttribute('data-src') || '',
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
            // Validar dados mínimos necessários
            if (!rawVehicle.title || !rawVehicle.detailUrl) {
              skippedCount++;
              continue;
            }

            const detailUrl = rawVehicle.detailUrl.startsWith('http') 
              ? rawVehicle.detailUrl 
              : `${this.baseUrl}${rawVehicle.detailUrl}`;

            // Extrair ID externo (extrair da URL)
            const externalId = detailUrl.split('/').filter(s => s).pop() || `sodre-${Date.now()}-${Math.random()}`;

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

            const vehicleData: VehicleData = {
              external_id: externalId,
              title: rawVehicle.title,
              brand: brand || 'Desconhecida',
              model: model || 'Desconhecido',
              year_manufacture: undefined, // Não disponível na listagem
              year_model: undefined,
              vehicle_type: this.detectVehicleType(rawVehicle.vehicleType || rawVehicle.title),
              mileage: mileage,
              state: state || 'SP',
              city: city || 'São Paulo',
              current_bid: currentBid,
              auction_type: 'Online',
              condition: 'Usado',
              original_url: detailUrl,
              thumbnail_url: rawVehicle.imageUrl || undefined,
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
}

