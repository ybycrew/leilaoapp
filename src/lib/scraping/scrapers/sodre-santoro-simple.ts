import { VehicleData } from '../base-scraper';

/**
 * Scraper simples para Sodré Santoro (sem Puppeteer)
 * Usa apenas fetch/axios para fazer scraping básico
 * Para usar quando Puppeteer não está disponível (ex: Vercel)
 */
export class SodreSantoroSimpleScraper {
  private readonly auctioneerName = 'Sodré Santoro';
  private readonly baseUrl = 'https://www.sodresantoro.com.br';

  async run(): Promise<VehicleData[]> {
    console.log(`[${this.auctioneerName}] Iniciando scraping simples (sem Puppeteer)...`);
    
    try {
      // Por enquanto, retornar dados de teste
      // TODO: Implementar scraping com fetch/axios
      const testVehicles: VehicleData[] = [
        {
          external_id: 'test-001',
          title: 'HONDA CIVIC 2.0 EXL 16V FLEX 4P AUTOMÁTICO',
          brand: 'HONDA',
          model: 'CIVIC',
          version: '2.0 EXL 16V FLEX 4P AUTOMÁTICO',
          year_manufacture: 2018,
          year_model: 2018,
          vehicle_type: 'CARRO',
          color: 'PRATA',
          fuel_type: 'FLEX',
          transmission: 'AUTOMÁTICO',
          mileage: 45000,
          state: 'SP',
          city: 'São Paulo',
          current_bid: 45000,
          minimum_bid: 42000,
          auction_date: new Date('2025-10-25'),
          auction_type: 'JUDICIAL',
          has_financing: false,
          condition: 'USADO',
          original_url: `${this.baseUrl}/leilao/test-001`,
          thumbnail_url: 'https://via.placeholder.com/300x200?text=Honda+Civic',
          images: ['https://via.placeholder.com/300x200?text=Honda+Civic']
        },
        {
          external_id: 'test-002',
          title: 'VOLKSWAGEN GOL 1.0 12V FLEX 4P MANUAL',
          brand: 'VOLKSWAGEN',
          model: 'GOL',
          version: '1.0 12V FLEX 4P MANUAL',
          year_manufacture: 2020,
          year_model: 2020,
          vehicle_type: 'CARRO',
          color: 'BRANCO',
          fuel_type: 'FLEX',
          transmission: 'MANUAL',
          mileage: 32000,
          state: 'RJ',
          city: 'Rio de Janeiro',
          current_bid: 35000,
          minimum_bid: 33000,
          auction_date: new Date('2025-10-26'),
          auction_type: 'JUDICIAL',
          has_financing: false,
          condition: 'USADO',
          original_url: `${this.baseUrl}/leilao/test-002`,
          thumbnail_url: 'https://via.placeholder.com/300x200?text=Volkswagen+Gol',
          images: ['https://via.placeholder.com/300x200?text=Volkswagen+Gol']
        }
      ];

      console.log(`[${this.auctioneerName}] Scraping simples concluído: ${testVehicles.length} veículos de teste`);
      return testVehicles;

    } catch (error: any) {
      console.error(`[${this.auctioneerName}] Erro no scraping simples:`, error);
      throw error;
    }
  }
}
