import puppeteer from 'puppeteer';
import { Vehicle } from '@/types/vehicle';

export interface ScraperConfig {
  name: string;
  url: string;
  selectors: {
    vehicleList: string;
    title: string;
    price: string;
    image: string;
    link: string;
    // Adicione mais seletores conforme necessário
  };
}

export async function scrapeAuctionSite(config: ScraperConfig): Promise<Partial<Vehicle>[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const vehicles: Partial<Vehicle>[] = [];

  try {
    await page.goto(config.url, { waitUntil: 'networkidle2', timeout: 30000 });

    const vehicleElements = await page.$$(config.selectors.vehicleList);

    for (const element of vehicleElements) {
      try {
        const titulo = await element.$eval(config.selectors.title, el => el.textContent?.trim() || '');
        const preco = await element.$eval(config.selectors.price, el => {
          const text = el.textContent?.trim() || '0';
          return parseFloat(text.replace(/[R$.\s]/g, '').replace(',', '.'));
        });
        const imagem = await element.$eval(config.selectors.image, el => el.getAttribute('src') || '');
        const link = await element.$eval(config.selectors.link, el => el.getAttribute('href') || '');

        vehicles.push({
          leiloeiro: config.name,
          leiloeiro_url: link.startsWith('http') ? link : `${config.url}${link}`,
          titulo,
          preco_inicial: preco,
          preco_atual: preco,
          imagens: [imagem],
        });
      } catch (error) {
        console.error(`Erro ao processar veículo no ${config.name}:`, error);
      }
    }
  } catch (error) {
    console.error(`Erro ao fazer scraping de ${config.name}:`, error);
  } finally {
    await browser.close();
  }

  return vehicles;
}

export function parseVehicleTitle(titulo: string): {
  marca?: string;
  modelo?: string;
  ano?: number;
} {
  // Regex básico para extrair marca, modelo e ano
  const anoMatch = titulo.match(/\b(19|20)\d{2}\b/);
  const ano = anoMatch ? parseInt(anoMatch[0]) : undefined;

  // Marcas comuns brasileiras
  const marcas = ['FIAT', 'VOLKSWAGEN', 'CHEVROLET', 'FORD', 'RENAULT', 'HYUNDAI', 'TOYOTA', 'HONDA', 'NISSAN', 'JEEP'];
  let marca: string | undefined;

  for (const m of marcas) {
    if (titulo.toUpperCase().includes(m)) {
      marca = m;
      break;
    }
  }

  // Extrair modelo (texto entre marca e ano)
  let modelo: string | undefined;
  if (marca && ano) {
    const regex = new RegExp(`${marca}\\s+(.+?)\\s+${ano}`, 'i');
    const match = titulo.match(regex);
    modelo = match ? match[1].trim() : undefined;
  }

  return { marca, modelo, ano };
}
