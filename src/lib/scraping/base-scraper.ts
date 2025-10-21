import puppeteer, { Browser, Page } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export interface VehicleData {
  external_id: string;
  lot_number?: string;
  title: string;
  brand: string;
  model: string;
  version?: string;
  year_manufacture?: number;
  year_model?: number;
  vehicle_type: string;
  color?: string;
  fuel_type?: string;
  transmission?: string;
  mileage?: number;
  license_plate?: string;
  state: string;
  city: string;
  current_bid?: number;
  minimum_bid?: number;
  appraised_value?: number;
  auction_date?: Date;
  auction_type?: string;
  has_financing?: boolean;
  condition?: string;
  original_url: string;
  thumbnail_url?: string;
  images?: string[];
}

export abstract class BaseScraper {
  protected browser?: Browser;
  protected page?: Page;
  protected auctioneerName: string;

  constructor(auctioneerName: string) {
    this.auctioneerName = auctioneerName;
  }

  /**
   * Inicializa o navegador Puppeteer
   */
  protected async initBrowser(): Promise<void> {
    console.log(`[${this.auctioneerName}] Inicializando navegador...`);
    
    const isVercel = process.env.VERCEL === '1';
    const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
    const isCI = isVercel || isGitHubActions;
    
    console.log(`[${this.auctioneerName}] Ambiente: ${isVercel ? 'Vercel (serverless)' : isGitHubActions ? 'GitHub Actions' : 'Desenvolvimento local'}`);
    
    let launchOptions: any;
    
    if (isCI) {
      // Configuração otimizada para CI (Vercel/GitHub Actions)
      console.log(`[${this.auctioneerName}] Usando configuração otimizada para CI...`);
      launchOptions = {
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images', // Não carregar imagens para economizar tempo
          '--disable-javascript', // Desabilitar JS desnecessário
        ],
        executablePath: await chromium.executablePath(),
        headless: true,
        ignoreHTTPSErrors: true,
        timeout: 30000, // Timeout reduzido
      };
    } else {
      // Configuração para desenvolvimento local
      console.log(`[${this.auctioneerName}] Usando configuração para desenvolvimento local...`);
      launchOptions = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--single-process',
        ],
      };
    }
    
    try {
      this.browser = await puppeteer.launch(launchOptions);
      console.log(`[${this.auctioneerName}] Navegador inicializado com sucesso`);
    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro ao inicializar navegador:`, error);
      throw error;
    }

    this.page = await this.browser.newPage();

    // Configurar viewport e user agent
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await this.page.setExtraHTTPHeaders({
      'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    });

    // Encaminhar logs do contexto da página para os logs do servidor (útil para debug de seletores)
    this.page.on('console', (msg) => {
      try {
        const type = msg.type();
        const text = msg.text();
        console.log(`[${this.auctioneerName}] [page.${type}] ${text}`);
      } catch {}
    });

    console.log(`[${this.auctioneerName}] Navegador inicializado`);
  }

  /**
   * Fecha o navegador
   */
  protected async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log(`[${this.auctioneerName}] Navegador fechado`);
    }
  }

  /**
   * Aguarda um tempo aleatório (para evitar detecção)
   */
  protected async randomDelay(min = 1000, max = 3000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Extrai texto de um elemento com segurança
   */
  protected async safeExtractText(
    selector: string,
    defaultValue = ''
  ): Promise<string> {
    if (!this.page) return defaultValue;

    try {
      const element = await this.page.$(selector);
      if (!element) return defaultValue;

      const text = await this.page.evaluate((el) => el?.textContent || '', element);
      return text.trim();
    } catch (error) {
      return defaultValue;
    }
  }

  /**
   * Extrai atributo de um elemento com segurança
   */
  protected async safeExtractAttribute(
    selector: string,
    attribute: string,
    defaultValue = ''
  ): Promise<string> {
    if (!this.page) return defaultValue;

    try {
      const element = await this.page.$(selector);
      if (!element) return defaultValue;

      const value = await this.page.evaluate(
        (el, attr) => el?.getAttribute(attr) || '',
        element,
        attribute
      );
      return value.trim();
    } catch (error) {
      return defaultValue;
    }
  }

  /**
   * Método abstrato que cada scraper deve implementar
   */
  abstract scrapeVehicles(): Promise<VehicleData[]>;

  /**
   * Método público para executar o scraping
   */
  async run(): Promise<VehicleData[]> {
    const startTime = Date.now();
    console.log(`[${this.auctioneerName}] Iniciando scraping...`);

    try {
      await this.initBrowser();
      const vehicles = await this.scrapeVehicles();
      
      const duration = Date.now() - startTime;
      console.log(
        `[${this.auctioneerName}] Scraping concluído: ${vehicles.length} veículos em ${duration}ms`
      );

      return vehicles;
    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro no scraping:`, error);
      throw error;
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Normaliza o nome da marca
   */
  protected normalizeBrand(brand: string): string {
    const brandMap: Record<string, string> = {
      'chevrolet': 'Chevrolet',
      'fiat': 'Fiat',
      'volkswagen': 'Volkswagen',
      'vw': 'Volkswagen',
      'ford': 'Ford',
      'honda': 'Honda',
      'toyota': 'Toyota',
      'hyundai': 'Hyundai',
      'nissan': 'Nissan',
      'renault': 'Renault',
      'jeep': 'Jeep',
      'peugeot': 'Peugeot',
      'citroen': 'Citroën',
      'mercedes': 'Mercedes-Benz',
      'bmw': 'BMW',
      'audi': 'Audi',
    };

    const normalized = brand.toLowerCase().trim();
    return brandMap[normalized] || brand;
  }

  /**
   * Extrai ano de fabricação e modelo de uma string
   */
  protected parseYear(yearString: string): { manufacture?: number; model?: number } {
    const match = yearString.match(/(\d{4})\/?(\d{4})?/);
    if (!match) return {};

    return {
      manufacture: match[1] ? parseInt(match[1]) : undefined,
      model: match[2] ? parseInt(match[2]) : undefined,
    };
  }

  /**
   * Limpa e converte preço para número
   */
  protected parsePrice(priceString: string): number | undefined {
    if (!priceString) return undefined;

    const cleaned = priceString
      .replace(/[R$\s.]/g, '')
      .replace(',', '.')
      .trim();

    const price = parseFloat(cleaned);
    return isNaN(price) ? undefined : price;
  }

  /**
   * Extrai quilometragem de uma string
   */
  protected parseMileage(mileageString: string): number | undefined {
    if (!mileageString) return undefined;

    const match = mileageString.match(/(\d+(?:\.\d+)?)/);
    if (!match) return undefined;

    const value = parseFloat(match[1].replace(/\./g, ''));
    return isNaN(value) ? undefined : value;
  }
}

