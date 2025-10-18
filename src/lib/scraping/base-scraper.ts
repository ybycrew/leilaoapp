import puppeteer, { Browser, Page } from 'puppeteer';

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
    
    // Try to find Chrome executable
    const possiblePaths = [
      process.env.CHROME_PATH,
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ].filter(Boolean);
    
    let executablePath: string | undefined;
    
    // Try to find a working Chrome executable
    for (const path of possiblePaths) {
      try {
        const { execSync } = require('child_process');
        execSync(`"${path}" --version`, { stdio: 'ignore' });
        executablePath = path;
        console.log(`[${this.auctioneerName}] Chrome encontrado em: ${path}`);
        break;
      } catch (error) {
        console.log(`[${this.auctioneerName}] Chrome não encontrado em: ${path}`);
      }
    }
    
    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    };
    
    // Only set executablePath if we found a valid Chrome installation
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }
    
    this.browser = await puppeteer.launch(launchOptions);

    this.page = await this.browser.newPage();

    // Configurar viewport e user agent
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

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

