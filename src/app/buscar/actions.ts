'use server';

import { createClient } from '@/lib/supabase/server';
import { buildSearchKey, toAsciiUpper } from '@/lib/fipe-normalization';
import { filterValidStates, filterValidCities, isValidBrazilianState, isValidCity } from '@/lib/utils';

export interface SearchFilters {
  q?: string;
  state?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  vehicleType?: string[];
  fuelType?: string[];
  transmission?: string[];
  color?: string[];
  auctionType?: string[];
  hasFinancing?: boolean;
  minMileage?: number;
  maxMileage?: number;
  minDealScore?: number;
  minFipeDiscount?: number;
  auctioneer?: string[];
  licensePlateEnd?: string;
  orderBy?: 'deal_score' | 'price_asc' | 'price_desc' | 'date_asc' | 'date_desc';
  limit?: number;
  offset?: number;
  page?: number;
}

export interface Vehicle {
  id: string;
  auctioneer_name: string;
  auctioneer_logo: string | null;
  title: string;
  brand: string;
  model: string;
  year_model: number | null;
  vehicle_type: string | null;
  mileage: number | null;
  state: string;
  city: string;
  current_bid: number | null;
  fipe_price: number | null;
  fipe_discount_percentage: number | null;
  auction_date: string | null;
  has_financing: boolean;
  deal_score: number | null;
  original_url: string;
  thumbnail_url: string | null;
}

/**
 * Mapeia tipo de veículo do filtro para valor normalizado no banco
 */
function normalizeVehicleTypeForFilter(vehicleType: string): string {
  const normalized = vehicleType.toLowerCase().trim();
  const mapping: Record<string, string> = {
    // Valores do filtro (minúsculas) → Valores no banco (exatos)
    'carro': 'Carros',
    'carros': 'Carros',
    'moto': 'Motos',
    'motos': 'Motos',
    'caminhao': 'Caminhões e Ônibus',
    'caminhão': 'Caminhões e Ônibus',
    'caminhoes': 'Caminhões e Ônibus',
    'caminhões': 'Caminhões e Ônibus',
    'onibus': 'Caminhões e Ônibus',
    'ônibus': 'Caminhões e Ônibus',
    'van': 'Carros', // Vans são classificadas como Carros
    'outros': 'Caminhões e Ônibus',
  };
  return mapping[normalized] || vehicleType;
}

export async function searchVehicles(filters: SearchFilters = {}) {
  const supabase = await createClient();

  try {
    // Normalizar estado para maiúscula (UF)
    const normalizedState = filters.state ? filters.state.trim().toUpperCase() : null;

    // Construir query usando a view vehicles_with_auctioneer diretamente
    let query = supabase
      .from('vehicles_with_auctioneer')
      .select('*', { count: 'exact' });

    // Aplicar filtros - usando colunas em inglês da view
    if (filters.q) {
      // Busca mais assertiva: busca em título, marca, modelo e descrição
      // Remove acentos e torna case-insensitive para melhor matching
      const searchTerm = filters.q.trim();
      query = query.or(`title.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`);
    }

    if (normalizedState) {
      query = query.eq('state', normalizedState);
    }

    if (filters.city) {
      query = query.eq('city', filters.city);
    }

    // Excluir leilões com data já passada: considerar apenas futuros
    query = query.gte('auction_date', new Date().toISOString());

    if (filters.vehicleType && filters.vehicleType.length > 0) {
      const normalizedTypes = filters.vehicleType.map(normalizeVehicleTypeForFilter);
      query = query.in('vehicle_type', normalizedTypes);
    }

    if (filters.minYear) {
      query = query.gte('year_manufacture', filters.minYear);
    }

    if (filters.maxYear) {
      query = query.lte('year_manufacture', filters.maxYear);
    }

    if (filters.minPrice) {
      query = query.gte('current_bid', filters.minPrice);
    }

    if (filters.maxPrice) {
      query = query.lte('current_bid', filters.maxPrice);
    }

    if (filters.fuelType && filters.fuelType.length > 0) {
      query = query.in('fuel_type', filters.fuelType);
    }

    if (filters.transmission && filters.transmission.length > 0) {
      query = query.in('transmission', filters.transmission);
    }

    if (filters.color && filters.color.length > 0) {
      query = query.in('color', filters.color);
    }

    if (filters.minMileage) {
      query = query.gte('mileage', filters.minMileage);
    }

    if (filters.maxMileage) {
      query = query.lte('mileage', filters.maxMileage);
    }

    if (filters.minDealScore) {
      query = query.gte('deal_score', filters.minDealScore);
    }

    if (filters.minFipeDiscount) {
      query = query.gte('fipe_discount_percentage', filters.minFipeDiscount);
    }

    if (filters.auctioneer && filters.auctioneer.length > 0) {
      query = query.in('auctioneer_name', filters.auctioneer);
    }

    if (filters.licensePlateEnd) {
      query = query.ilike('license_plate', `%${filters.licensePlateEnd}`);
    }

    if (filters.auctionType && filters.auctionType.length > 0) {
      query = query.in('auction_type', filters.auctionType);
    }

    if (filters.hasFinancing !== undefined) {
      query = query.eq('has_financing', filters.hasFinancing);
    }

    // Ordenação
    if (filters.orderBy) {
      switch (filters.orderBy) {
        case 'deal_score':
          query = query.order('deal_score', { ascending: false, nullsFirst: false });
          break;
        case 'price_asc':
          query = query.order('current_bid', { ascending: true, nullsFirst: false });
          break;
        case 'price_desc':
          query = query.order('current_bid', { ascending: false, nullsFirst: false });
          break;
        case 'date_asc':
          query = query.order('auction_date', { ascending: true, nullsFirst: false });
          break;
        case 'date_desc':
          query = query.order('auction_date', { ascending: false, nullsFirst: false });
          break;
        default:
          query = query.order('deal_score', { ascending: false, nullsFirst: false });
      }
    } else {
      query = query.order('deal_score', { ascending: false, nullsFirst: false });
    }

    // Paginação
    const limit = filters.limit || 20;
    const offset = ((filters.page || 1) - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[searchVehicles] Erro na query:', error);
      return {
        vehicles: [],
        total: 0,
        error: error.message,
        pagination: {
          page: filters.page || 1,
          limit: limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const vehicles = (data || []).map((row: any) => ({
      id: row.id,
      auctioneer_name: row.auctioneer_name || '',
      auctioneer_logo: row.auctioneer_logo,
      title: row.title || '',
      brand: row.brand || '',
      model: row.model || '',
      year_model: row.year_model,
      vehicle_type: row.vehicle_type,
      mileage: row.mileage,
      state: row.state || '',
      city: row.city || '',
      current_bid: row.current_bid,
      fipe_price: row.fipe_price,
      fipe_discount_percentage: row.fipe_discount_percentage,
      auction_date: row.auction_date,
      has_financing: row.has_financing || false,
      deal_score: row.deal_score,
      original_url: row.original_url || '',
      thumbnail_url: row.thumbnail_url,
    }));

    return {
      vehicles: vehicles as Vehicle[],
      total: count || 0,
      error: null,
      pagination: {
        page: filters.page || 1,
        limit: limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  } catch (error: any) {
    console.error('[searchVehicles] Erro geral:', error);
    return {
      vehicles: [],
      total: 0,
      error: error.message || 'Erro ao buscar veículos',
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 20,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

export async function getVehicleStats() {
  const supabase = await createClient();

  try {
    const { count, error } = await supabase
      .from('vehicles_with_auctioneer')
      .select('*', { count: 'exact', head: true })
      .gte('auction_date', new Date().toISOString());

    if (error) {
      console.error('[getVehicleStats] Erro:', error);
      return {
        totalVehicles: 0,
        totalBrands: 0,
      };
    }

    // Buscar número de marcas distintas
    const { data: brandsData, error: brandsError } = await supabase
      .from('vehicles_with_auctioneer')
      .select('brand')
      .not('brand', 'is', null)
      .gte('auction_date', new Date().toISOString());

    let totalBrands = 0;
    if (!brandsError && brandsData) {
      const brandSet = new Set<string>();
      brandsData.forEach((row: any) => {
        if (row?.brand && row.brand.trim() !== '') {
          brandSet.add(row.brand);
        }
      });
      totalBrands = brandSet.size;
    }

    return {
      totalVehicles: count || 0,
      totalBrands,
    };
  } catch (error: any) {
    console.error('[getVehicleStats] Erro geral:', error);
    return {
      totalVehicles: 0,
      totalBrands: 0,
    };
  }
}

function normalizeVehicleTypeForDatabase(vehicleType: string): string {
  const normalized = vehicleType.toLowerCase().trim();
  const mapping: Record<string, string> = {
    'carro': 'Carros',
    'carros': 'Carros',
    'moto': 'Motos',
    'motos': 'Motos',
    'caminhao': 'Caminhões e Ônibus',
    'caminhão': 'Caminhões e Ônibus',
    'caminhoes': 'Caminhões e Ônibus',
    'caminhões': 'Caminhões e Ônibus',
    'onibus': 'Caminhões e Ônibus',
    'ônibus': 'Caminhões e Ônibus',
    'van': 'Carros',
    'outros': 'Caminhões e Ônibus',
  };
  return mapping[normalized] || vehicleType;
}

function mapVehicleTypeToFipeSlug(vehicleType: string): string | null {
  const normalized = vehicleType.toLowerCase().trim();
  const mapping: Record<string, string> = {
    'carro': 'carros',
    'carros': 'carros',
    'moto': 'motos',
    'motos': 'motos',
    'caminhao': 'caminhoes',
    'caminhão': 'caminhoes',
    'caminhoes': 'caminhoes',
    'caminhões': 'caminhoes',
    'onibus': 'caminhoes',
    'ônibus': 'caminhoes',
    'van': 'carros',
    'outros': 'caminhoes',
  };
  return mapping[normalized] || null;
}

export async function getFilterOptions() {
  const supabase = await createClient();

  try {
    // DIAGNÓSTICO: Verificar quantos veículos existem na view
    const { count: totalCount } = await supabase
      .from('vehicles_with_auctioneer')
      .select('*', { count: 'exact', head: true });
    
    console.log(`[getFilterOptions] Total de veículos na view: ${totalCount}`);

    // Buscar estados (coluna: state) - com validação e paginação em blocos para evitar truncamento
    const stateRanges: Array<[number, number]> = [
      [0, 9999],
      [10000, 19999],
      [20000, 29999],
      [30000, 39999],
      [40000, 49999],
    ];

    const statesChunks = await Promise.all(
      stateRanges.map(async ([from, to]) => {
        const { data } = await supabase
          .from('vehicles_with_auctioneer')
          .select('state')
          .not('state', 'is', null)
          .range(from, to);
        return data || [];
      })
    );

    const statesData = statesChunks.flat();

    // Filtrar apenas estados válidos
    const states = filterValidStates(
      statesData.map((v: any) => v.state)
    );

    // Buscar cidades por estado (colunas: city, state) - com validação
    const { data: citiesData, error: citiesError } = await supabase
      .from('vehicles_with_auctioneer')
      .select('city, state')
      .not('city', 'is', null)
      .order('state', { ascending: true })
      .order('city', { ascending: true })
      .range(0, 50000);

    if (citiesError) {
      console.error('[getFilterOptions] Erro ao buscar cidades:', citiesError);
    }

    const citiesByState: Record<string, string[]> = {};
    citiesData?.forEach(v => {
      // Validar estado e cidade antes de adicionar
      if (isValidBrazilianState(v.state) && isValidCity(v.city)) {
        const stateKey = v.state!.trim().toUpperCase();
        const cityName = v.city!.trim();
        
        if (!citiesByState[stateKey]) {
          citiesByState[stateKey] = [];
        }
        if (!citiesByState[stateKey].includes(cityName)) {
          citiesByState[stateKey].push(cityName);
        }
      }
    });

    // Ordenar cidades de cada estado
    Object.keys(citiesByState).forEach(state => {
      citiesByState[state].sort();
    });

    // Buscar leiloeiros ativos diretamente da tabela auctioneers (cobrir todos, independentes de haver veículos)
    let auctioneers: string[] = [];
    try {
      const { data: auctioneersData, error: auctioneersError } = await supabase
        .from('auctioneers')
        .select('name, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true })
        .range(0, 5000);

      if (!auctioneersError && auctioneersData) {
        auctioneers = Array.from(
          new Set(
            auctioneersData
              ?.map(v => (v as any).name)
              .filter((name): name is string => Boolean(name && name.trim() !== '')) || []
          )
        ).sort();
      }
    } catch (err) {
      console.warn('[getFilterOptions] Erro ao buscar leiloeiros:', err);
    }

    // Buscar combustíveis (coluna: fuel_type)
    let fuels: string[] = [];
    try {
      const { data: fuelData, error: fuelError } = await supabase
        .from('vehicles_with_auctioneer')
        .select('fuel_type')
        .not('fuel_type', 'is', null);

      if (!fuelError && fuelData) {
        fuels = Array.from(
          new Set(
            fuelData
              ?.map(v => (v as any).fuel_type)
              .filter((fuel): fuel is string => Boolean(fuel && fuel.trim() !== '')) || []
          )
        ).sort();
      }
    } catch (err) {
      console.warn('[getFilterOptions] Erro ao buscar combustíveis:', err);
    }

    // Buscar transmissões (coluna: transmission)
    const { data: transmissionData, error: transmissionError } = await supabase
      .from('vehicles_with_auctioneer')
      .select('transmission')
      .not('transmission', 'is', null);

    if (transmissionError) {
      console.error('[getFilterOptions] Erro ao buscar transmissões:', transmissionError);
    }

    const transmissions = Array.from(
      new Set(
        transmissionData
          ?.map(v => (v as any).transmission)
          .filter((transmission): transmission is string => Boolean(transmission && transmission.trim() !== '')) || []
      )
    ).sort();

    // Buscar cores (coluna: color)
    const { data: colorsData, error: colorsError } = await supabase
      .from('vehicles_with_auctioneer')
      .select('color')
      .not('color', 'is', null);

    if (colorsError) {
      console.error('[getFilterOptions] Erro ao buscar cores:', colorsError);
    }

    const colors = Array.from(
      new Set(
        colorsData
          ?.map(v => (v as any).color)
          .filter((color): color is string => Boolean(color && color.trim() !== '')) || []
      )
    ).sort();

    // Buscar tipos de veículo (coluna: vehicle_type)
    let vehicleTypes: string[] = [];
    try {
      const { data: vehicleTypesData, error: vehicleTypesError } = await supabase
        .from('vehicles_with_auctioneer')
        .select('vehicle_type')
        .not('vehicle_type', 'is', null);

      if (!vehicleTypesError && vehicleTypesData) {
        vehicleTypes = Array.from(
          new Set(
            vehicleTypesData
              ?.map(v => (v as any).vehicle_type)
              .filter((type): type is string => Boolean(type && type.trim() !== '')) || []
          )
        ).sort();
      }
    } catch (err) {
      console.warn('[getFilterOptions] Erro ao buscar tipos de veículo:', err);
    }

    console.log('Filter options loaded:', {
      states: states.length,
      vehicleTypes: vehicleTypes.length,
      fuels: fuels.length,
      transmissions: transmissions.length,
      colors: colors.length,
      auctioneers: auctioneers.length,
    });

    return {
      states,
      citiesByState,
      auctioneers,
      fuels,
      transmissions,
      colors,
      vehicleTypes,
    };
  } catch (error) {
    console.error('Erro geral ao buscar opções de filtro:', error);
    return {
      states: [],
      citiesByState: {},
      auctioneers: [],
      fuels: [],
      transmissions: [],
      colors: [],
      vehicleTypes: [],
    };
  }
}

/**
 * Interface para sugestões de busca
 */
export interface SearchSuggestions {
  brands: string[];
  models: string[];
  titles: string[];
}

/**
 * Busca sugestões de busca em tempo real para autocomplete
 * Retorna marcas, modelos e títulos que correspondem ao termo de busca
 */
export async function getSearchSuggestions(query: string): Promise<SearchSuggestions> {
  const supabase = await createClient();

  if (!query || query.trim().length < 2) {
    return {
      brands: [],
      models: [],
      titles: [],
    };
  }

  const searchTerm = query.trim();

  try {
    // Buscar apenas veículos futuros
    const baseQuery = supabase
      .from('vehicles_with_auctioneer')
      .gte('auction_date', new Date().toISOString());

    // Buscar marcas distintas que correspondem
    const { data: brandsData } = await baseQuery
      .select('brand')
      .not('brand', 'is', null)
      .ilike('brand', `%${searchTerm}%`)
      .limit(10);

    const brands: string[] = Array.from(
      new Set(
        (brandsData || [])
          .map((row: any) => row?.brand)
          .filter((brand: any): brand is string => typeof brand === 'string' && brand.trim() !== '')
      )
    ).sort();

    // Buscar modelos distintos que correspondem
    const { data: modelsData } = await baseQuery
      .select('model')
      .not('model', 'is', null)
      .ilike('model', `%${searchTerm}%`)
      .limit(10);

    const models: string[] = Array.from(
      new Set(
        (modelsData || [])
          .map((row: any) => row?.model)
          .filter((model: any): model is string => typeof model === 'string' && model.trim() !== '')
      )
    ).sort();

    // Buscar títulos que correspondem (mais relevantes primeiro)
    const { data: titlesData } = await baseQuery
      .select('title')
      .not('title', 'is', null)
      .ilike('title', `%${searchTerm}%`)
      .order('deal_score', { ascending: false, nullsFirst: false })
      .limit(8);

    const titles: string[] = Array.from(
      new Set(
        (titlesData || [])
          .map((row: any) => row?.title)
          .filter((title: any): title is string => typeof title === 'string' && title.trim() !== '')
      )
    ).slice(0, 8);

    return {
      brands,
      models,
      titles,
    };
  } catch (error) {
    console.error('[getSearchSuggestions] Erro:', error);
    return {
      brands: [],
      models: [],
      titles: [],
    };
  }
}
