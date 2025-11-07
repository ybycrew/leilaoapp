'use server';

import { createClient } from '@/lib/supabase/server';
import { 
  filterValidBrands, 
  isOnlyNumbers, 
  isPart, 
  isInvalidBrandWord,
  separateBrandModel 
} from '@/lib/vehicle-normalization';

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

export async function searchVehicles(filters: SearchFilters = {}) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc('search_vehicles', {
      p_search_text: filters.q || null,
      p_states: filters.state ? [filters.state] : null,
      p_cities: filters.city ? [filters.city] : null,
      p_brands: filters.brand && filters.brand.length > 0 ? filters.brand : null,
      p_models: filters.model && filters.model.length > 0 ? filters.model : null,
      p_min_year: filters.minYear || null,
      p_max_year: filters.maxYear || null,
      p_min_price: filters.minPrice || null,
      p_max_price: filters.maxPrice || null,
      p_vehicle_types: filters.vehicleType && filters.vehicleType.length > 0 ? filters.vehicleType : null,
      p_fuel_types: filters.fuelType && filters.fuelType.length > 0 ? filters.fuelType : null,
      p_transmissions: filters.transmission && filters.transmission.length > 0 ? filters.transmission : null,
      p_min_mileage: filters.minMileage || null,
      p_max_mileage: filters.maxMileage || null,
      p_auction_types: filters.auctionType && filters.auctionType.length > 0 ? filters.auctionType : null,
      p_has_financing: filters.hasFinancing !== undefined ? filters.hasFinancing : null,
      p_conditions: null,
      p_sort_by: filters.orderBy === 'deal_score' ? 'deal_score' : 
                 filters.orderBy === 'price_asc' ? 'price_asc' :
                 filters.orderBy === 'price_desc' ? 'price_desc' :
                 filters.orderBy === 'date_asc' ? 'date_asc' :
                 filters.orderBy === 'date_desc' ? 'date_desc' : 'auction_date',
      p_sort_order: filters.orderBy === 'price_desc' || filters.orderBy === 'date_desc' ? 'desc' : 'asc',
      p_limit: filters.limit || 50,
      p_offset: filters.offset || 0,
    });

    if (error) {
      console.error('Erro ao buscar veÃ­culos:', error);
      return { vehicles: [], total: 0, error: error.message };
    }

    return { 
      vehicles: data as Vehicle[], 
      total: data?.length || 0,
      error: null 
    };
  } catch (error: any) {
    console.error('Erro na busca:', error);
    return { 
      vehicles: [], 
      total: 0, 
      error: error.message || 'Erro ao buscar veÃ­culos' 
    };
  }
}

export async function getVehicleStats() {
  const supabase = await createClient();

  try {
    const { count } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true });

    const { data: brands } = await supabase
      .from('vehicles')
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
    // DIAGNÓSTICO: Verificar quantos veículos existem na tabela
    const { count: totalCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true });
    
    console.log(`[getFilterOptions] Total de veículos na tabela: ${totalCount}`);

    // Buscar marcas (coluna: brand)
    const { data: brandsData, error: brandsError } = await supabase
      .from('vehicles')
      .select('brand')
      .not('brand', 'is', null);

    if (brandsError) {
      console.error('[getFilterOptions] Erro ao buscar marcas:', brandsError);
    } else {
      console.log(`[getFilterOptions] Marcas encontradas (raw):`, brandsData?.length || 0);
      if (brandsData && brandsData.length > 0) {
        console.log(`[getFilterOptions] Primeiras 5 marcas:`, brandsData.slice(0, 5).map(v => v.brand));
      }
    }

    // Filtrar marcas brutas removendo valores inválidos básicos
    const rawBrands = Array.from(
      new Set(
        brandsData
          ?.map(v => v.brand)
          .filter((brand): brand is string => {
            if (!brand || typeof brand !== 'string') return false;
            const trimmed = brand.trim();
            if (trimmed.length === 0) return false;
            
            // Remover apenas números
            if (isOnlyNumbers(trimmed)) return false;
            
            // Remover peças
            if (isPart(trimmed)) return false;
            
            // Remover palavras inválidas
            if (isInvalidBrandWord(trimmed)) return false;
            
            return true;
          }) || []
      )
    );

    // Separar combinações como "CHEVROLET/CORSA"
    const separatedBrands = new Set<string>();
    for (const brand of rawBrands) {
      const separated = separateBrandModel(brand);
      if (separated.brand) {
        separatedBrands.add(separated.brand);
      } else {
        separatedBrands.add(brand);
      }
    }

    // Filtrar e normalizar marcas usando API FIPE (assíncrono, mas vamos fazer de forma otimizada)
    // Por performance, vamos fazer validação básica primeiro e depois validar contra FIPE
    const brands = await filterValidBrands(Array.from(separatedBrands), 'carros');

    console.log(`[getFilterOptions] Marcas únicas após filtro:`, brands.length);
    console.log(`[getFilterOptions] Marcas filtradas (primeiras 10):`, brands.slice(0, 10));

    // Buscar modelos (coluna: model)
    const { data: modelsData, error: modelsError } = await supabase
      .from('vehicles')
      .select('model')
      .not('model', 'is', null);

    if (modelsError) {
      console.error('[getFilterOptions] Erro ao buscar modelos:', modelsError);
    } else {
      console.log(`[getFilterOptions] Modelos encontrados (raw):`, modelsData?.length || 0);
    }

    // Filtrar modelos brutos removendo valores inválidos básicos
    const rawModels = Array.from(
      new Set(
        modelsData
          ?.map(v => v.model)
          .filter((model): model is string => {
            if (!model || typeof model !== 'string') return false;
            const trimmed = model.trim();
            if (trimmed.length === 0) return false;
            
            // Remover apenas números
            if (isOnlyNumbers(trimmed)) return false;
            
            // Remover peças
            if (isPart(trimmed)) return false;
            
            return true;
          }) || []
      )
    );

    // Por performance, não vamos validar todos os modelos contra FIPE aqui
    // (seria muito lento). Apenas filtramos valores claramente inválidos.
    // A validação completa será feita quando o usuário selecionar uma marca.
    const models = rawModels.sort();

    // Buscar estados (coluna: state)
    const { data: statesData, error: statesError } = await supabase
      .from('vehicles')
      .select('state')
      .not('state', 'is', null);

    if (statesError) {
      console.error('[getFilterOptions] Erro ao buscar estados:', statesError);
    } else {
      console.log(`[getFilterOptions] Estados encontrados (raw):`, statesData?.length || 0);
    }

    const states = Array.from(
      new Set(
        statesData
          ?.map(v => v.state)
          .filter((state): state is string => Boolean(state && state.trim() !== '')) || []
      )
    ).sort();

    // Buscar cidades por estado (colunas: city, state)
    const { data: citiesData, error: citiesError } = await supabase
      .from('vehicles')
      .select('city, state')
      .not('city', 'is', null);

    if (citiesError) {
      console.error('[getFilterOptions] Erro ao buscar cidades:', citiesError);
    }

    const citiesByState: Record<string, string[]> = {};
    citiesData?.forEach(v => {
      if (v.city && v.city.trim() !== '' && v.state && v.state.trim() !== '') {
        if (!citiesByState[v.state]) {
          citiesByState[v.state] = [];
        }
        if (!citiesByState[v.state].includes(v.city)) {
          citiesByState[v.state].push(v.city);
        }
      }
    });

    Object.keys(citiesByState).forEach(state => {
      citiesByState[state].sort();
    });

    // Buscar leiloeiros (coluna: auctioneer ou leiloeiro - tentar ambos)
    let auctioneers: string[] = [];
    try {
      // Tentar primeiro com auctioneer (inglês)
      const { data: auctioneersData, error: auctioneersError } = await supabase
        .from('vehicles')
        .select('auctioneer')
        .not('auctioneer', 'is', null);

      if (auctioneersError) {
        // Se falhar, tentar com leiloeiro (português)
        const { data: leiloeiroData, error: leiloeiroError } = await supabase
          .from('vehicles')
          .select('leiloeiro')
          .not('leiloeiro', 'is', null);
        
        if (!leiloeiroError && leiloeiroData) {
          auctioneers = Array.from(
            new Set(
              leiloeiroData
                ?.map(v => (v as any).leiloeiro)
                .filter((leiloeiro): leiloeiro is string => Boolean(leiloeiro && leiloeiro.trim() !== '')) || []
            )
          ).sort();
        }
      } else if (auctioneersData) {
        auctioneers = Array.from(
          new Set(
            auctioneersData
              ?.map(v => (v as any).auctioneer)
              .filter((auctioneer): auctioneer is string => Boolean(auctioneer && auctioneer.trim() !== '')) || []
          )
        ).sort();
      }
    } catch (err) {
      console.warn('[getFilterOptions] Erro ao buscar leiloeiros:', err);
    }

    // Buscar combustíveis (coluna: fuel_type ou fuel)
    let fuels: string[] = [];
    try {
      const { data: fuelData, error: fuelError } = await supabase
        .from('vehicles')
        .select('fuel_type')
        .not('fuel_type', 'is', null);

      if (fuelError) {
        // Tentar com fuel (sem _type)
        const { data: fuelDataAlt, error: fuelErrorAlt } = await supabase
          .from('vehicles')
          .select('fuel')
          .not('fuel', 'is', null);
        
        if (!fuelErrorAlt && fuelDataAlt) {
          fuels = Array.from(
            new Set(
              fuelDataAlt
                ?.map(v => (v as any).fuel)
                .filter((fuel): fuel is string => Boolean(fuel && fuel.trim() !== '')) || []
            )
          ).sort();
        }
      } else if (fuelData) {
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
      .from('vehicles')
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
      .from('vehicles')
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

    console.log('Filter options loaded:', {
      brands: brands.length,
      models: models.length,
      states: states.length,
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
    };
  }
}

export async function getModelsByBrand(brand: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('model')
      .eq('brand', brand)
      .not('model', 'is', null);

    if (error) {
      console.error('[getModelsByBrand] Erro:', error);
      return [];
    }

    const models = Array.from(
      new Set(
        data
          ?.map(v => (v as any).model)
          .filter((model): model is string => Boolean(model && model.trim() !== '')) || []
      )
    ).sort();

    return models;
  } catch (error) {
    console.error('[getModelsByBrand] Erro:', error);
    return [];
  }
}
