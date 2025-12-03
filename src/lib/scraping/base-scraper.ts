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
   * Detecta o caminho do Chrome/Chromium automaticamente
   */
  protected async detectChromePath(): Promise<string | null> {
    const fs = await import('fs/promises');
    const possiblePaths = [
      process.env.CHROME_PATH,
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium',
      '/opt/google/chrome/chrome',
    ].filter(Boolean) as string[];
    
    for (const path of possiblePaths) {
      try {
        await fs.access(path);
        return path;
      } catch {
        // Continuar procurando
      }
    }
    
    return null;
  }

  protected async initBrowser(): Promise<void> {
    console.log(`[${this.auctioneerName}] Inicializando navegador...`);
    
    const isVercel = process.env.VERCEL === '1';
    const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
    const isLinux = process.platform === 'linux';
    
    // Detectar VPS: Linux + não é Vercel/GitHub Actions (VPS geralmente é Linux)
    // Se CHROME_PATH está configurado, é definitivamente VPS/CI
    const hasChromePath = !!(process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH);
    const isVPS = (isLinux && !isVercel && !isGitHubActions) || hasChromePath || process.env.VPS === '1';
    const isCI = isVercel || isGitHubActions || isVPS;
    
    console.log(`[${this.auctioneerName}] Ambiente: ${isVercel ? 'Vercel (serverless)' : isGitHubActions ? 'GitHub Actions' : isVPS ? 'VPS (producao)' : 'Desenvolvimento local'}`);
    
    let launchOptions: any;
    
    if (isCI) {
      if (isVPS) {
        console.log(`[${this.auctioneerName}] Usando configuracao para VPS...`);
        
        // Detectar Chrome automaticamente
        const chromePath = await this.detectChromePath();
        
        if (!chromePath) {
          throw new Error(
            `Chrome/Chromium não encontrado no VPS. ` +
            `Configure CHROME_PATH ou PUPPETEER_EXECUTABLE_PATH, ` +
            `ou instale Chrome/Chromium no sistema.`
          );
        }
        
        console.log(`[${this.auctioneerName}] Chrome encontrado em: ${chromePath}`);
        
        launchOptions = {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-blink-features=AutomationControlled',
          ],
          executablePath: chromePath,
          headless: 'new',
          ignoreHTTPSErrors: true,
          timeout: 30000,
        };
      } else {
        console.log(`[${this.auctioneerName}] Usando configuracao otimizada para CI...`);
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
          ],
          executablePath: await chromium.executablePath(),
          headless: true,
          ignoreHTTPSErrors: true,
          timeout: 30000,
        };
      }
    } else {
      console.log(`[${this.auctioneerName}] Usando configuracao para desenvolvimento local...`);
      
      // Verificar se CHROME_PATH está configurado (pode ser VPS mesmo sem NODE_ENV=production)
      const chromePath = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
      
      if (chromePath) {
        console.log(`[${this.auctioneerName}] CHROME_PATH detectado, usando configuração VPS-compatível`);
        launchOptions = {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-blink-features=AutomationControlled',
          ],
          executablePath: chromePath,
          headless: 'new',
          ignoreHTTPSErrors: true,
          timeout: 30000,
        };
      } else {
        // Desenvolvimento local real - tentar detectar Chrome automaticamente
        console.log(`[${this.auctioneerName}] Tentando detectar Chrome para desenvolvimento local...`);
        const detectedChrome = await this.detectChromePath();
        
        if (detectedChrome) {
          console.log(`[${this.auctioneerName}] Chrome detectado: ${detectedChrome}`);
          launchOptions = {
            headless: 'new',
            executablePath: detectedChrome,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu',
              '--disable-web-security',
              '--single-process',
            ],
          };
        } else {
          // Se não encontrou Chrome, usar configuração básica
          // Nota: puppeteer-core requer executablePath, então isso pode falhar
          // mas vamos tentar para manter compatibilidade com desenvolvimento local
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
      }
    }
    
    // Garantir que puppeteer-core sempre tenha executablePath quando necessário
    // Se ainda não tiver e estiver em ambiente que precisa, dar erro claro
    if (!launchOptions.executablePath) {
      const detectedPath = await this.detectChromePath();
      
      if (detectedPath) {
        launchOptions.executablePath = detectedPath;
        console.log(`[${this.auctioneerName}] Chrome detectado automaticamente em: ${detectedPath}`);
      } else if (isVPS || isCI) {
        // Em VPS/CI, é obrigatório ter Chrome configurado
        throw new Error(
          `puppeteer-core requer executablePath no VPS/CI. ` +
          `Configure CHROME_PATH ou PUPPETEER_EXECUTABLE_PATH, ` +
          `ou instale Chrome/Chromium no sistema.`
        );
      }
    }
    
    try {
      this.browser = await puppeteer.launch(launchOptions);
      console.log(`[${this.auctioneerName}] Navegador inicializado com sucesso`);
    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro ao inicializar navegador:`, error);
      throw error;
    }

    this.page = await this.browser.newPage();

    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await this.page.setExtraHTTPHeaders({
      'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    });

    this.page.on('console', (msg) => {
      try {
        const type = msg.type();
        const text = msg.text();
        console.log(`[${this.auctioneerName}] [page.${type}] ${text}`);
      } catch {}
    });

    console.log(`[${this.auctioneerName}] Navegador inicializado`);
  }

  protected async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log(`[${this.auctioneerName}] Navegador fechado`);
    }
  }

  protected async randomDelay(min = 1000, max = 3000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

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

  abstract scrapeVehicles(): Promise<VehicleData[]>;

  async run(): Promise<VehicleData[]> {
    const startTime = Date.now();
    console.log(`[${this.auctioneerName}] Iniciando scraping...`);

    try {
      await this.initBrowser();
      const vehicles = await this.scrapeVehicles();
      
      const duration = Date.now() - startTime;
      console.log(
        `[${this.auctioneerName}] Scraping concluido: ${vehicles.length} veiculos em ${duration}ms`
      );

      return vehicles;
    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro no scraping:`, error);
      throw error;
    } finally {
      await this.closeBrowser();
    }
  }

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
      'citroen': 'Citroen',
      'mercedes': 'Mercedes-Benz',
      'bmw': 'BMW',
      'audi': 'Audi',
    };

    const normalized = brand.toLowerCase().trim();
    return brandMap[normalized] || brand;
  }

  protected parseYear(yearString: string): { manufacture?: number; model?: number } {
    const match = yearString.match(/(\d{4})\/?(\d{4})?/);
    if (!match) return {};

    return {
      manufacture: match[1] ? parseInt(match[1]) : undefined,
      model: match[2] ? parseInt(match[2]) : undefined,
    };
  }

  protected parsePrice(priceString: string): number | undefined {
    if (!priceString) return undefined;

    const cleaned = priceString
      .replace(/[R$\s.]/g, '')
      .replace(',', '.')
      .trim();

    const price = parseFloat(cleaned);
    return isNaN(price) ? undefined : price;
  }

  protected parseMileage(mileageString: string): number | undefined {
    if (!mileageString) return undefined;

    const match = mileageString.match(/(\d+(?:\.\d+)?)/);
    if (!match) return undefined;

    const value = parseFloat(match[1].replace(/\./g, ''));
    return isNaN(value) ? undefined : value;
  }
}

