import { BaseScraper, VehicleData } from '../base-scraper';
import { extractBrandAndModel } from '../brands';

interface SodreSearchLotsResponse {
  results?: any[];
  total?: number;
  page?: number;
  perPage?: number;
}

/**
 * Scraper que consome a API oficial do Sodré Santoro (POST /api/search-lots)
 * para coletar dados estruturados de veículos, evitando parsing de HTML.
 */
export class SodreSantoroRealScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.sodresantoro.com.br';
  private readonly vehiclesUrl = `${this.baseUrl}/veiculos/lotes?sort=auction_date_init_asc`;
  private readonly perPage = 60;

  constructor() {
    super('Sodré Santoro');
  }

  async scrapeVehicles(): Promise<VehicleData[]> {
    if (!this.page) {
      throw new Error('Página não inicializada');
    }

    console.log(`[${this.auctioneerName}] Iniciando coleta via API oficial...`);
    await this.page.goto(this.vehiclesUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    await this.page.waitForFunction(() => typeof fetch === 'function');

    const vehicles: VehicleData[] = [];
    const seenIds = new Set<string>();

    let currentPage = 1;
    let total = Infinity;

    while ((currentPage - 1) * this.perPage < total) {
      console.log(`[${this.auctioneerName}] Buscando página ${currentPage}...`);

      const response = await this.fetchLotsPage(currentPage, this.perPage);
      const results = response.results ?? [];

      if (typeof response.total === 'number') {
        total = response.total;
      }

      if (results.length === 0) {
        console.log(`[${this.auctioneerName}] Página ${currentPage} vazia. Encerrando paginação.`);
        break;
      }

      for (const lot of results) {
        const vehicle = this.transformLot(lot);
        if (!vehicle) {
          continue;
        }

        if (seenIds.has(vehicle.external_id)) {
          continue;
        }

        seenIds.add(vehicle.external_id);
        vehicles.push(vehicle);
      }

      if (results.length < this.perPage) {
        break;
      }

      currentPage += 1;
      await this.randomDelay(150, 400);
    }

    console.log(`[${this.auctioneerName}] Coleta finalizada. ${vehicles.length} lotes processados.`);
    return vehicles;
  }

  private async fetchLotsPage(pageNumber: number, perPage: number): Promise<SodreSearchLotsResponse> {
    if (!this.page) {
      throw new Error('Página não inicializada');
    }

    const payload = {
      page: pageNumber,
      perPage,
      filters: {
        segment_slug: ['veiculos'],
      },
      sort: [
        {
          auction_date_init: 'asc',
        },
      ],
    };

    try {
      const data = await this.page.evaluate(async (body) => {
        const res = await fetch('/api/search-lots', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        return res.json();
      }, payload);

      return data as SodreSearchLotsResponse;
    } catch (error: any) {
      console.error(`[${this.auctioneerName}] Erro ao consultar API na página ${pageNumber}:`, error?.message ?? error);
      return { results: [], total: 0, page: pageNumber, perPage };
    }
  }

  private transformLot(lot: any): VehicleData | null {
    const externalId = this.extractExternalId(lot);
    const title = lot?.lot_title || lot?.title || '';

    if (!externalId || !title) {
      return null;
    }

    const { brand: fallbackBrand, model: fallbackModel } = extractBrandAndModel(title);

    const brand = this.normalizeText(lot?.lot_brand) || fallbackBrand || 'Desconhecida';
    const model = this.normalizeText(lot?.lot_model) || fallbackModel || 'Desconhecido';

    const stateCity = this.resolveLocation(lot);

    const vehicle: VehicleData = {
      external_id: externalId,
      lot_number: lot?.lot_number?.toString?.() ?? lot?.lotNumber?.toString?.(),
      title,
      brand,
      model,
      version: this.normalizeText(lot?.lot_version),
      year_manufacture: this.parseYear(lot?.lot_year_manufacture) ?? undefined,
      year_model: this.parseYear(lot?.lot_year_model) ?? undefined,
      vehicle_type: this.resolveVehicleType(lot),
      color: this.normalizeText(lot?.lot_color),
      fuel_type: this.normalizeText(lot?.lot_fuel),
      transmission: this.normalizeText(lot?.lot_transmission),
      mileage: this.parseNumber(lot?.lot_km) ?? undefined,
      license_plate: this.normalizeText(lot?.lot_plate),
      state: stateCity.state,
      city: stateCity.city,
      current_bid: this.parseNumber(lot?.bid_actual ?? lot?.price) ?? undefined,
      minimum_bid: this.parseNumber(lot?.bid_initial) ?? undefined,
      appraised_value: this.parseNumber(lot?.lot_appraised_value ?? lot?.reserved_price) ?? undefined,
      auction_date: this.parseDate(lot?.lot_date_end ?? lot?.auction_date_end ?? lot?.auction_date_init) ?? undefined,
      auction_type: this.normalizeText(lot?.auction_type) || 'Online',
      has_financing: this.parseBoolean(lot?.lot_financeable),
      condition: this.normalizeText(lot?.lot_status),
      original_url: `${this.baseUrl}/lote/${externalId}`,
      thumbnail_url: this.extractImages(lot)[0] ?? undefined,
      images: this.extractImages(lot),
    };

    return vehicle;
  }

  private extractExternalId(lot: any): string | null {
    const possible = [lot?.id, lot?.lot_id, lot?.index_id, lot?.lotNumber];
    for (const value of possible) {
      if (value === undefined || value === null) continue;
      const str = String(value).trim();
      if (str.length > 0) {
        return str;
      }
    }
    return null;
  }

  private normalizeText(value: any): string | undefined {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return undefined;
  }

  private parseNumber(value: any): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
      const normalized = value
        .replace(/[^0-9,-\.]/g, '')
        .replace(/\.(?=\d{3}(?:\D|$))/g, '')
        .replace(',', '.');

      const parsed = parseFloat(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private parseYear(value: any): number | null {
    const parsed = this.parseNumber(value);
    if (!parsed) return null;
    const year = Math.floor(parsed);
    if (year >= 1950 && year <= new Date().getFullYear() + 1) {
      return year;
    }
    return null;
  }

  private parseDate(value: any): Date | null {
    if (!value) return null;

    if (value instanceof Date && !isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === 'number') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }

    if (typeof value === 'string') {
      const isoCandidate = value.replace(' ', 'T');
      const date = new Date(isoCandidate);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      return ['true', '1', 'financiavel', 'financiável', 'sim'].includes(normalized);
    }
    return false;
  }

  private resolveLocation(lot: any): { state: string; city: string } {
    let state = this.normalizeText(lot?.lot_state) || this.normalizeText(lot?.state);
    let city = this.normalizeText(lot?.lot_city) || this.normalizeText(lot?.city);

    const location = this.normalizeText(lot?.lot_location);
    if ((!state || !city) && location) {
      const cleaned = location.replace(/\s*-\s*/g, ',').replace(/\s*\/\s*/g, ',');
      const parts = cleaned.split(',').map((part) => part.trim()).filter(Boolean);

      if (!city && parts.length > 0) {
        city = parts[0];
      }

      if (!state && parts.length > 1) {
        const last = parts[parts.length - 1];
        state = last.length === 2 ? last.toUpperCase() : last;
      }
    }

    if (!state && typeof city === 'string' && city.includes('/')) {
      const [cityPart, statePart] = city.split('/');
      city = cityPart.trim();
      state = statePart?.trim()?.toUpperCase();
    }

    if (!state) state = 'SP';
    if (!city) city = 'São Paulo';

    return { state, city };
  }

  private resolveVehicleType(lot: any): string {
    const candidates = [
      lot?.lot_category,
      lot?.segment_label,
      lot?.lot_segment,
    ];

    for (const candidate of candidates) {
      const text = this.normalizeText(candidate);
      if (!text) continue;
      const lower = text.toLowerCase();
      if (lower.includes('moto')) return 'Moto';
      if (lower.includes('caminh')) return 'Caminhão';
      if (lower.includes('ônibus') || lower.includes('onibus')) return 'Ônibus';
      if (lower.includes('van') || lower.includes('utilit')) return 'Utilitário';
      if (lower.includes('sucata')) return 'Sucata';
      if (lower.includes('judicial')) return 'Judicial';
      return text;
    }

    return 'Carro';
  }

  private extractImages(lot: any): string[] {
    if (Array.isArray(lot?.lot_pictures)) {
      return lot.lot_pictures.filter((url: any) => typeof url === 'string' && url.length > 0);
    }

    if (typeof lot?.lot_picture === 'string') {
      return [lot.lot_picture];
    }

    return [];
  }
}
