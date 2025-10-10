import { BaseScraper, VehicleData } from '../base-scraper';

/**
 * Scraper para o leiloeiro Sodré Santoro
 * Site: https://www.sodresantoro.com.br/veiculos/lotes
 * 
 * ✅ Scraper PRONTO e FUNCIONAL
 * - URL específica: /veiculos/lotes (apenas veículos)
 * - Suporta paginação (todas as ~16 páginas)
 * - Extrai: título, preço, localização, quilometragem, imagens
 * - Seletores baseados na estrutura real do site (Tailwind CSS)
 * - Detecção inteligente de última página (URL, veículos vazios, botões)
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
    let currentPage = 1;
    const maxPages = 20; // Limite de segurança (site tem ~16 páginas de veículos)

    try {
      // 1. Navegar para a primeira página de veículos
      console.log(`[${this.auctioneerName}] Acessando ${this.vehiclesUrl}`);
      await this.page.goto(this.vehiclesUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      await this.randomDelay();

      // 2. Loop de paginação
      while (currentPage <= maxPages) {
        console.log(`[${this.auctioneerName}] Processando página ${currentPage}...`);

        // Aguardar os cards de veículos carregarem
        await this.page.waitForSelector('.wrapper.relative.rounded-medium', {
          timeout: 10000,
        }).catch(() => {
          console.log(`[${this.auctioneerName}] Timeout ao aguardar cards.`);
        });

        await this.randomDelay(1000, 2000);

        // 3. Extrair dados dos veículos da página atual
        const pageVehicles = await this.page.evaluate(() => {
          const cards = document.querySelectorAll('.wrapper.relative.rounded-medium');
          
          return Array.from(cards).map(card => {
            try {
              // Imagem
              const imageEl = card.querySelector('img.block.w-full.h-full') as HTMLImageElement;
              
              // Modelo/Título com link
              const titleEl = card.querySelector('.text-body-medium.text-on-surface.uppercase.h-10.line-clamp-2');
              const linkEl = card.querySelector('a');
              
              // Banco/Leiloeiro
              const bankEl = card.querySelector('.text-body-small.text-on-surface-variant.uppercase.line-clamp-1');
              
              // Lance atual
              const priceEl = card.querySelector('.text-primary.text-headline-small');
              
              // Elementos que se repetem (data, tipo, localização, km)
              const smallTexts = card.querySelectorAll('.line-clamp-1.text-body-small');
              
              return {
                title: titleEl?.textContent?.trim() || '',
                bank: bankEl?.textContent?.trim() || '',
                price: priceEl?.textContent?.trim() || '',
                imageUrl: imageEl?.src || imageEl?.getAttribute('data-src') || '',
                detailUrl: linkEl?.getAttribute('href') || '',
                vehicleType: smallTexts[0]?.textContent?.trim() || '',
                location: smallTexts[1]?.textContent?.trim() || '',
                mileage: smallTexts[2]?.textContent?.trim() || '',
              };
            } catch (err) {
              return null;
            }
          }).filter(v => v !== null) as any[];
        });

        console.log(`[${this.auctioneerName}] Página ${currentPage}: ${pageVehicles.length} veículos encontrados`);

        // Se não encontrou veículos, provavelmente é a última página
        if (pageVehicles.length === 0) {
          console.log(`[${this.auctioneerName}] Nenhum veículo encontrado, última página`);
          break;
        }

        // 4. Processar e adicionar veículos ao array final
        for (const rawVehicle of pageVehicles) {
          try {
            const detailUrl = rawVehicle.detailUrl.startsWith('http') 
              ? rawVehicle.detailUrl 
              : `${this.baseUrl}${rawVehicle.detailUrl}`;

            // Extrair marca e modelo do título
            const { brand, model } = this.parseTitleForBrandModel(rawVehicle.title);
            
            // Parse do preço
            const currentBid = this.parsePrice(rawVehicle.price);
            
            // Parse da quilometragem
            const mileage = this.parseMileage(rawVehicle.mileage);
            
            // Parse da localização
            const { state, city } = this.parseLocation(rawVehicle.location);
            
            // ID externo (extrair da URL)
            const externalId = detailUrl.split('/').pop() || `sodre-${Date.now()}-${Math.random()}`;

            const vehicleData: VehicleData = {
              external_id: externalId,
              title: rawVehicle.title || 'Veículo sem título',
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
          } catch (error) {
            console.error(`[${this.auctioneerName}] Erro ao processar veículo:`, error);
          }
        }

        // 5. Tentar avançar para próxima página
        const hasNextPage = await this.page.evaluate(() => {
          const buttons = document.querySelectorAll('.state.absolute.inset-0.w-full.h-full.z-10.state-layer');
          // Se houver 2+ botões, o último é "próxima"
          return buttons.length >= 2;
        });

        if (!hasNextPage) {
          console.log(`[${this.auctioneerName}] Última página alcançada`);
          break;
        }

        // Clicar no botão de próxima página
        try {
          // Salvar URL atual para comparação
          const currentUrl = this.page.url();
          
          await this.page.evaluate(() => {
            const buttons = document.querySelectorAll('.state.absolute.inset-0.w-full.h-full.z-10.state-layer');
            const nextBtn = buttons[buttons.length - 1] as HTMLElement;
            if (nextBtn) nextBtn.click();
          });

          // Aguardar navegação com timeout menor
          await this.randomDelay(2000, 3000);
          await this.page.waitForNavigation({ 
            waitUntil: 'networkidle2', 
            timeout: 10000 
          }).catch(() => {
            console.log(`[${this.auctioneerName}] Timeout na navegação, mas pode ter carregado`);
          });

          // Verificar se a URL realmente mudou
          const newUrl = this.page.url();
          if (currentUrl === newUrl) {
            console.log(`[${this.auctioneerName}] URL não mudou, provavelmente última página`);
            break;
          }
        } catch (navError) {
          console.log(`[${this.auctioneerName}] Erro ao navegar para próxima página`);
          break;
        }

        currentPage++;
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

