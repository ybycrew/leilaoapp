import { BaseScraper, VehicleData } from '../base-scraper';
import { extractBrandAndModel } from '../brands';

interface SuperbidApiResponse {
  total?: number;
  offers?: any[];
}

/**
 * Scraper que consome a API pública da Superbid (offer-query.superbid.net)
 * para obter dados estruturados dos lotes sem necessidade de parsing de HTML.
 */
export class SuperbidRealScraper extends BaseScraper {
  private readonly apiBase = 'https://offer-query.superbid.net/seo/offers/';
  private readonly baseOfferUrl = 'https://www.superbid.net/oferta';
  private readonly pageSize = 60;

  constructor() {
    super('Superbid Real');
  }

  async run(): Promise<VehicleData[]> {
    const startTime = Date.now();
    console.log(`[${this.auctioneerName}] Iniciando scraping via API...`);

    try {
      const vehicles = await this.scrapeVehicles();
      const duration = Date.now() - startTime;
      console.log(`[${this.auctioneerName}] Scraping concluído: ${vehicles.length} veículos em ${duration}ms`);
      return vehicles;
    } catch (error) {
      console.error(`[${this.auctioneerName}] Erro no scraping:`, error);
      throw error;
    }
  }

  async scrapeVehicles(): Promise<VehicleData[]> {
    const vehicles: VehicleData[] = [];
    const seenIds = new Set<string>();

    let currentPage = 1;
    let total = Infinity;

    while ((currentPage - 1) * this.pageSize < total) {
      const response = await this.fetchPage(currentPage, this.pageSize);
      const offers = response.offers ?? [];

      if (typeof response.total === 'number') {
        total = response.total;
      }

      if (offers.length === 0) {
        break;
      }

      for (const offer of offers) {
        const vehicle = this.transformOffer(offer);
        if (!vehicle) {
          continue;
        }

        if (seenIds.has(vehicle.external_id)) {
          continue;
        }

        seenIds.add(vehicle.external_id);
        vehicles.push(vehicle);
      }

      if (offers.length < this.pageSize) {
        break;
      }

      currentPage += 1;
    }

    return vehicles;
  }

  private async fetchPage(pageNumber: number, pageSize: number): Promise<SuperbidApiResponse> {
    const params = new URLSearchParams({
      filter: '',
      locale: 'pt_BR',
      orderBy: 'endDate:asc',
      pageNumber: String(pageNumber),
      pageSize: String(pageSize),
      portalId: '[2,15]'
    });

    params.set('preOrderBy', 'orderByFirstOpenedOffers');
    params.set('requestOrigin', 'marketplace');
    params.set('searchType', 'opened');
    params.set('timeZoneId', 'America/Sao_Paulo');
    params.set('urlSeo', 'https://www.superbid.net/categorias/carros-motos');

    const url = `${this.apiBase}?${params.toString()}`;

    const res = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; LeilaoAppBot/1.0; +https://github.com/)',
        accept: 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Falha ao consultar Superbid: HTTP ${res.status}`);
    }

    return (await res.json()) as SuperbidApiResponse;
  }

  private transformOffer(offer: any): VehicleData | null {
    const externalId = offer?.id ? String(offer.id) : null;
    if (!externalId) {
      return null;
    }

    const product = offer?.product ?? {};
    const offerDetail = offer?.offerDetail ?? {};
    const auction = offer?.auction ?? {};

    const { brand: fallbackBrand, model: fallbackModel } = extractBrandAndModel(product?.shortDesc || offer?.offerDescription?.offerDescription || '');

    const templateValues = this.extractTemplateValues(product?.template?.groups ?? []);

    const brand = product?.brand?.description || templateValues.get('marca') || fallbackBrand || 'Desconhecida';
    const model = product?.model?.description || templateValues.get('modelo') || fallbackModel || 'Desconhecido';

    const yearManufacture = this.parseYearValue(templateValues.get('anofabricacao'));
    const yearModel = this.parseYearValue(templateValues.get('anomodelo') ?? templateValues.get('anomodelo2'));

    const mileage = this.parseNumber(templateValues.get('km') ?? templateValues.get('quilometragem'));

    const color = templateValues.get('cor');
    const fuel = templateValues.get('combustivel');
    const transmission = templateValues.get('cambio') ?? templateValues.get('transmissao');
    const licensePlate = templateValues.get('placa');

    const location = this.resolveLocation(product, auction);

    const images = this.extractImages(product);

    const vehicle: VehicleData = {
      external_id: externalId,
      lot_number: offer?.lotNumber ? String(offer.lotNumber) : undefined,
      title: product?.shortDesc || offer?.offerDescription?.offerDescription || `${brand} ${model}`,
      brand,
      model,
      year_manufacture: yearManufacture ?? undefined,
      year_model: yearModel ?? undefined,
      vehicle_type: this.resolveVehicleType(product),
      color: color ?? undefined,
      fuel_type: fuel ?? undefined,
      transmission: transmission ?? undefined,
      mileage: mileage ?? undefined,
      license_plate: licensePlate ?? undefined,
      state: location.state,
      city: location.city,
      current_bid: this.parseNumber(offerDetail?.currentMinBid ?? offer?.price) ?? undefined,
      minimum_bid: this.parseNumber(offerDetail?.initialBidValue) ?? undefined,
      appraised_value: this.parseNumber(offerDetail?.reservedPrice) ?? undefined,
      auction_date: this.parseDate(offer?.endDate ?? auction?.endDate) ?? undefined,
      auction_type: auction?.modalityDesc ?? 'Leilão',
      has_financing: Boolean(offer?.commercialCondition?.allowsCreditCard),
      condition: this.resolveCondition(offer),
      original_url: `${this.baseOfferUrl}/${externalId}`,
      thumbnail_url: images[0] ?? product?.thumbnailUrl ?? undefined,
      images: images.length ? images : undefined,
    };

    return vehicle;
  }

  private extractTemplateValues(groups: any[]): Map<string, string> {
    const map = new Map<string, string>();

    for (const group of groups ?? []) {
      for (const property of group?.properties ?? []) {
        const key = String(property?.id ?? '').toLowerCase();
        if (!key) continue;

        const value = property?.value ?? property?.valuesByLocale?.pt_BR ?? property?.valuesByLocale?.en_US;
        if (typeof value === 'string' && value.trim().length > 0) {
          map.set(key, value.trim());
        }
      }
    }

    return map;
  }

  private extractImages(product: any): string[] {
    if (!Array.isArray(product?.galleryJson)) {
      return product?.thumbnailUrl ? [product.thumbnailUrl] : [];
    }

    return product.galleryJson
      .map((item: any) => item?.link || item?.thumbnailUrl)
      .filter((url: any) => typeof url === 'string' && url.length > 0);
  }

  private resolveLocation(product: any, auction: any): { state: string; city: string } {
    let state = product?.location?.state || auction?.address?.stateCode;
    let city = product?.location?.city;

    if (typeof city === 'string' && city.includes('-')) {
      const [cityPart, statePart] = city.split('-');
      city = cityPart.trim();
      state = state ?? statePart?.trim();
    }

    if (!city && auction?.address?.city) {
      city = auction.address.city;
    }

    if (!state) state = 'SP';
    if (!city) city = 'São Paulo';

    return { state, city };
  }

  private resolveVehicleType(product: any): string {
    const candidates = [
      product?.subCategory?.category?.description,
      product?.productType?.description,
      product?.subCategory?.description,
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue;
      if (candidate.toLowerCase().includes('moto')) return 'Moto';
      if (candidate.toLowerCase().includes('caminh')) return 'Caminhão';
      if (candidate.toLowerCase().includes('ônibus') || candidate.toLowerCase().includes('onibus')) return 'Ônibus';
      if (candidate.toLowerCase().includes('van')) return 'Van';
      return candidate;
    }

    return 'Carro';
  }

  private resolveCondition(offer: any): string | undefined {
    const status = offer?.offerStatus;
    if (!status) {
      return undefined;
    }

    if (status.closed || status.sold) {
      return 'Encerrado';
    }

    return 'Aberto';
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

  private parseYearValue(value: any): number | null {
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
      const normalized = value.replace(' ', 'T');
      const date = new Date(normalized);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }
}
