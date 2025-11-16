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
  brand?: string[];
  model?: string[];
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
    'carro': 'Carro',
    'moto': 'Moto',
    'caminhao': 'Caminhão',
    'caminhão': 'Caminhão',
    'van': 'Van',
    'outros': 'Ônibus',
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
      query = query.or(`title.ilike.%${filters.q}%,model.ilike.%${filters.q}%,brand.ilike.%${filters.q}%`);
    }

    if (normalizedState) {
      query = query.eq('state', normalizedState);
    }

    if (filters.city) {
      query = query.eq('city', filters.city);
    }

    if (filters.brand && filters.brand.length > 0) {
      query = query.in('brand', filters.brand);
    }

    if (filters.model && filters.model.length > 0) {
      query = query.in('model', filters.model);
    }

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

    if (filters.auctionType && filters.auctionType.length > 0) {
      query = query.in('auction_type', filters.auctionType);
    }

    if (filters.hasFinancing !== undefined) {
      query = query.eq('has_financing', filters.hasFinancing);
    }

    if (filters.licensePlateEnd) {
      query = query.ilike('license_plate', `%${filters.licensePlateEnd}`);
    }

    if (filters.minDealScore) {
      query = query.gte('deal_score', filters.minDealScore);
    }

    if (filters.auctioneer && filters.auctioneer.length > 0) {
      query = query.in('auctioneer_name', filters.auctioneer);
    }

    // Ordenação
    switch (filters.orderBy) {
      case 'price_asc':
        query = query.order('current_bid', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('current_bid', { ascending: false });
        break;
      case 'date_asc':
        query = query.order('auction_date', { ascending: true });
        break;
      case 'date_desc':
        query = query.order('auction_date', { ascending: false });
        break;
      case 'deal_score':
      default:
        query = query.order('deal_score', { ascending: false, nullsFirst: false });
        break;
    }

    // Paginação
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar veículos:', error);
      return { vehicles: [], total: 0, error: error.message };
    }

    const vehicles = (data ?? []).map((item: any) => {
      const imagens: string[] =
        item.imagens && Array.isArray(item.imagens) && item.imagens.length > 0
          ? item.imagens
          : item.images && Array.isArray(item.images) && item.images.length > 0
          ? item.images
          : item.thumbnail_url
          ? [item.thumbnail_url]
          : [];

      if (!item.imagens || item.imagens.length === 0) {
        item.imagens = imagens;
      }

      if (!item.titulo && item.title) {
        item.titulo = item.title;
      }
      if (!item.marca && item.brand) {
        item.marca = item.brand;
      }
      if (!item.modelo && item.model) {
        item.modelo = item.model;
      }
      if (item.km === undefined && item.mileage !== undefined) {
        item.km = item.mileage;
      }
      if (!item.combustivel && item.fuel_type) {
        item.combustivel = item.fuel_type;
      }
      if (!item.cambio && item.transmission) {
        item.cambio = item.transmission;
      }
      if (!item.estado && item.state) {
        item.estado = item.state;
      }
      if (!item.cidade && item.city) {
        item.cidade = item.city;
      }
      if (!item.preco_atual && item.current_bid !== undefined) {
        item.preco_atual = item.current_bid;
      }
      if (!item.preco_inicial && item.minimum_bid !== undefined) {
        item.preco_inicial = item.minimum_bid;
      }
      if (!item.data_leilao && item.auction_date) {
        item.data_leilao = item.auction_date;
      }

      return item;
    });

    return { 
      vehicles: vehicles as Vehicle[], 
      total: count || 0,
      error: null 
    };
  } catch (error: any) {
    console.error('Erro na busca:', error);
    return { 
      vehicles: [], 
      total: 0, 
      error: error.message || 'Erro ao buscar veículos' 
    };
  }
}

export async function getVehicleStats() {
  const supabase = await createClient();

  try {
    const { count } = await supabase
      .from('vehicles_with_auctioneer')
      .select('*', { count: 'exact', head: true });

    const { data: brands } = await supabase
      .from('vehicles_with_auctioneer')
      .select('brand')
      .not('brand', 'is', null);

    const uniqueBrands = new Set(brands?.map(v => v.brand));

    return {
      totalVehicles: count || 0,
      totalBrands: uniqueBrands.size,
    };
  } catch (error) {
    return { totalVehicles: 0, totalBrands: 0 };
  }
}

export async function getFilterOptions() {
  const supabase = await createClient();

  try {
    // DIAGNÓSTICO: Verificar quantos veículos existem na view
    const { count: totalCount } = await supabase
      .from('vehicles_with_auctioneer')
      .select('*', { count: 'exact', head: true });
    
    console.log(`[getFilterOptions] Total de veículos na view: ${totalCount}`);

    // Buscar marcas a partir das tabelas de referência FIPE
    const { data: brandsData, error: brandsError } = await supabase
      .from('fipe_brands')
      .select('name_upper')
      .order('name_upper');

    let brands: string[] = [];
    if (brandsError) {
      console.error('[getFilterOptions] Erro ao buscar marcas FIPE:', brandsError);
    } else if (brandsData) {
      const brandSet = new Set<string>();
      brandsData.forEach((row: any) => {
        if (row?.name_upper) {
          brandSet.add(row.name_upper);
        }
      });
      brands = Array.from(brandSet);
    }

    // Buscar um subconjunto inicial de modelos base FIPE (lista completa por marca é carregada sob demanda)
    const { data: modelsSnapshot, error: modelsError } = await supabase
      .from('fipe_models')
      .select('base_name_upper')
      .order('base_name_upper')
      .limit(200);

    let models: string[] = [];
    if (modelsError) {
      console.error('[getFilterOptions] Erro ao buscar modelos FIPE:', modelsError);
    } else if (modelsSnapshot) {
      const modelSet = new Set<string>();
      modelsSnapshot.forEach((row: any) => {
        if (row?.base_name_upper) {
          modelSet.add(row.base_name_upper);
        }
      });
      models = Array.from(modelSet);
    }

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

    // Buscar leiloeiros da view (coluna: auctioneer_name)
    let auctioneers: string[] = [];
    try {
      const { data: auctioneersData, error: auctioneersError } = await supabase
        .from('vehicles_with_auctioneer')
        .select('auctioneer_name')
        .not('auctioneer_name', 'is', null);

      if (!auctioneersError && auctioneersData) {
        auctioneers = Array.from(
          new Set(
            auctioneersData
              ?.map(v => (v as any).auctioneer_name)
              .filter((auctioneer): auctioneer is string => Boolean(auctioneer && auctioneer.trim() !== '')) || []
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
      brands: brands.length,
      models: models.length,
      states: states.length,
      vehicleTypes: vehicleTypes.length,
      fuels: fuels.length,
      transmissions: transmissions.length,
      colors: colors.length,
      auctioneers: auctioneers.length,
    });

    return {
      brands,
      models,
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
      brands: [],
      models: [],
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
 * Mapeia tipo de veículo do sistema para slug do FIPE
 */
function mapVehicleTypeToFipeSlug(vehicleType: string | null | undefined): string | null {
  if (!vehicleType) return null;
  const normalized = vehicleType.toLowerCase().trim();
  
  // Mapear tipos do sistema para slugs FIPE
  if (normalized === 'carro' || normalized === 'car') {
    return 'carros';
  }
  if (normalized === 'moto' || normalized === 'motorcycle') {
    return 'motos';
  }
  if (normalized === 'caminhao' || normalized === 'caminhão' || normalized === 'truck') {
    return 'caminhoes';
  }
  // Van e outros não têm correspondência direta na FIPE, retornar null
  return null;
}

/**
 * Busca marcas FIPE filtradas por tipo de veículo
 */
export async function getBrandsByVehicleType(vehicleType?: string | null) {
  const supabase = await createClient();

  try {
    let brandsQuery = supabase
      .from('fipe_brands')
      .select('name_upper')
      .order('name_upper');

    // Se vehicleType fornecido, filtrar por vehicle_type_id
    if (vehicleType) {
      const fipeSlug = mapVehicleTypeToFipeSlug(vehicleType);
      if (fipeSlug) {
        const { data: vehicleTypeData, error: vehicleTypeError } = await supabase
          .from('fipe_vehicle_types')
          .select('id')
          .eq('slug', fipeSlug)
          .single();

        if (!vehicleTypeError && vehicleTypeData) {
          brandsQuery = brandsQuery.eq('vehicle_type_id', vehicleTypeData.id);
        }
      }
    }

    const { data: brandsData, error: brandsError } = await brandsQuery;

    if (brandsError) {
      console.error('[getBrandsByVehicleType] Erro ao buscar marcas:', brandsError);
      return [];
    }

    const brandSet = new Set<string>();
    brandsData?.forEach((row: any) => {
      if (row?.name_upper) {
        brandSet.add(row.name_upper);
      }
    });

    return Array.from(brandSet).sort();
  } catch (error) {
    console.error('[getBrandsByVehicleType] Erro:', error);
    return [];
  }
}

export async function getModelsByBrand(brand: string, vehicleType?: string | null) {
  const supabase = await createClient();

  try {
    // Se vehicleType fornecido, buscar vehicle_type_id correspondente
    let vehicleTypeId: string | null = null;
    if (vehicleType) {
      const fipeSlug = mapVehicleTypeToFipeSlug(vehicleType);
      if (fipeSlug) {
        const { data: vehicleTypeData, error: vehicleTypeError } = await supabase
          .from('fipe_vehicle_types')
          .select('id')
          .eq('slug', fipeSlug)
          .single();

        if (!vehicleTypeError && vehicleTypeData) {
          vehicleTypeId = vehicleTypeData.id;
        }
      }
    }

    const brandIds = new Set<string>();
    const searchKey = buildSearchKey(brand);
    const brandUpper = toAsciiUpper(brand);

    // Construir query base
    let brandsQuery = supabase
      .from('fipe_brands')
      .select('id');

    // Filtrar por vehicle_type_id se fornecido
    if (vehicleTypeId) {
      brandsQuery = brandsQuery.eq('vehicle_type_id', vehicleTypeId);
    }

    // Tentar busca exata por search_name
    const { data: searchMatches, error: searchError } = await brandsQuery
      .eq('search_name', searchKey);

    if (searchError) {
      console.warn('[getModelsByBrand] Erro ao buscar marca por search_name:', searchError);
    } else {
      searchMatches?.forEach((row) => brandIds.add(row.id));
    }

    // Se não encontrou, tentar por name_upper
    if (brandIds.size === 0) {
      let upperQuery = supabase
        .from('fipe_brands')
        .select('id');
      
      if (vehicleTypeId) {
        upperQuery = upperQuery.eq('vehicle_type_id', vehicleTypeId);
      }

      const { data: upperMatches, error: upperError } = await upperQuery
        .eq('name_upper', brandUpper);

      if (upperError) {
        console.warn('[getModelsByBrand] Erro ao buscar marca por name_upper:', upperError);
      } else {
        upperMatches?.forEach((row) => brandIds.add(row.id));
      }
    }

    // Se ainda não encontrou, tentar busca fuzzy
    if (brandIds.size === 0) {
      let fuzzyQuery = supabase
        .from('fipe_brands')
        .select('id');
      
      if (vehicleTypeId) {
        fuzzyQuery = fuzzyQuery.eq('vehicle_type_id', vehicleTypeId);
      }

      const { data: fuzzyMatches, error: fuzzyError } = await fuzzyQuery
        .ilike('name_upper', `%${brandUpper}%`);

      if (fuzzyError) {
        console.warn('[getModelsByBrand] Erro ao buscar marca (fuzzy):', fuzzyError);
      } else {
        fuzzyMatches?.forEach((row) => brandIds.add(row.id));
      }
    }

    if (brandIds.size === 0) {
      return [];
    }

    const ids = Array.from(brandIds);

    const { data: modelsData, error: modelError } = await supabase
      .from('fipe_models')
      .select('base_name_upper')
      .in('brand_id', ids)
      .order('base_name_upper')
      .limit(5000);

    if (modelError) {
      console.error('[getModelsByBrand] Erro ao buscar modelos FIPE:', modelError);
      return [];
    }

    const modelSet = new Set<string>();
    modelsData?.forEach((row: any) => {
      if (row?.base_name_upper) {
        modelSet.add(row.base_name_upper);
      }
    });

    return Array.from(modelSet).sort();
  } catch (error) {
    console.error('[getModelsByBrand] Erro:', error);
    return [];
  }
}
