import { BaseScraper, VehicleData } from '../base-scraper';

/**
 * Scraper para o leiloeiro Sodré Santoro
 * Site: https://www.sodresantoro.com.br
 * 
 * IMPORTANTE: Este é um EXEMPLO. Você precisa adaptar os seletores
 * CSS baseado na estrutura real do site.
 */
export class SodreSantoroScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.sodresantoro.com.br';
  private readonly vehiclesUrl = `${this.baseUrl}/veiculos`;

  constructor() {
    super('Sodré Santoro');
  }

  async scrapeVehicles(): Promise<VehicleData[]> {
    if (!this.page) throw new Error('Página não inicializada');

    const vehicles: VehicleData[] = [];

    try {
      // 1. Navegar para a página de veículos
      console.log(`[${this.auctioneerName}] Acessando ${this.vehiclesUrl}`);
      await this.page.goto(this.vehiclesUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      await this.randomDelay();

      // 2. Aguardar os cards de veículos carregarem
      // ATENÇÃO: Substitua '.vehicle-card' pelo seletor real do site
      await this.page.waitForSelector('.vehicle-card, .lote, .item-leilao', {
        timeout: 10000,
      }).catch(() => {
        console.log(`[${this.auctioneerName}] Timeout ao aguardar cards. Tentando continuar...`);
      });

      // 3. Extrair todos os links dos veículos
      const vehicleLinks = await this.page.evaluate(() => {
        // ATENÇÃO: Adapte os seletores conforme a estrutura do site
        const cards = document.querySelectorAll('.vehicle-card a, .lote a, .item-leilao a');
        return Array.from(cards)
          .map((card) => (card as HTMLAnchorElement).href)
          .filter((href) => href && href.includes('/veiculo/') || href.includes('/lote/'));
      });

      console.log(`[${this.auctioneerName}] Encontrados ${vehicleLinks.length} veículos`);

      // 4. Processar cada veículo (limite de 50 para teste)
      const maxVehicles = Math.min(vehicleLinks.length, 50);
      
      for (let i = 0; i < maxVehicles; i++) {
        const link = vehicleLinks[i];
        console.log(`[${this.auctioneerName}] Processando ${i + 1}/${maxVehicles}: ${link}`);

        try {
          const vehicleData = await this.scrapeVehicleDetail(link);
          if (vehicleData) {
            vehicles.push(vehicleData);
          }
        } catch (error) {
          console.error(`[${this.auctioneerName}] Erro ao processar veículo ${link}:`, error);
        }

        // Delay entre requisições
        await this.randomDelay(1000, 2000);
      }

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

