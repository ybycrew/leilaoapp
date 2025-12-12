'use server';

import { createClient } from '@/lib/supabase/server';
import { buildSearchKey, toAsciiUpper } from '@/lib/fipe-normalization';
import { filterValidStates, filterValidCities, isValidBrazilianState, isValidCity } from '@/lib/utils';

export interface SearchFilters {
  q?: string | string[];
  state?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  vehicleType?: string[];
  hasFinancing?: boolean;
  auctioneer?: string[];
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
    // Verificar autenticação do usuário
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        vehicles: [],
        total: 0,
        error: 'Você precisa estar autenticado para buscar veículos',
        upgradeRequired: false,
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 20,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Buscar informações do usuário (plano e buscas restantes)
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('plano, buscas_restantes')
      .eq('id', user.id)
      .single();

    // Se o usuário não existir na tabela users, criar automaticamente usando upsert
    if (userError || !userData) {
      console.warn('Usuário não encontrado na tabela users, criando automaticamente:', userError);
      
      // Usar upsert para criar ou atualizar (mais seguro que insert)
      const { data: newUserData, error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email || '',
          plano: 'gratuito',
          buscas_restantes: 5,
        }, {
          onConflict: 'id'
        })
        .select('plano, buscas_restantes')
        .single();

      if (upsertError || !newUserData) {
        console.error('Erro ao criar/atualizar usuário na tabela users:', upsertError);
        // Usar valores padrão se não conseguir criar (fallback)
        userData = {
          plano: 'gratuito' as const,
          buscas_restantes: 5,
        };
      } else {
        userData = newUserData;
      }
    }

    // Verificar limite de buscas para usuários gratuitos
    if (userData.plano === 'gratuito') {
      if (userData.buscas_restantes <= 0) {
        return {
          vehicles: [],
          total: 0,
          error: 'LIMIT_REACHED',
          message: 'Você atingiu o limite de buscas gratuitas. Faça upgrade para continuar buscando.',
          upgradeRequired: true,
          pagination: {
            page: filters.page || 1,
            limit: filters.limit || 20,
            total: 0,
            totalPages: 0,
          },
        };
      }

      // Decrementar contador de buscas restantes
      const { error: updateError } = await supabase
        .from('users')
        .update({ buscas_restantes: userData.buscas_restantes - 1 })
        .eq('id', user.id);

      if (updateError) {
        console.error('Erro ao decrementar buscas restantes:', updateError);
        // Não bloquear a busca, apenas logar o erro
      }
    }
    // Normalizar estado para maiúscula (UF)
    const normalizedState = filters.state ? filters.state.trim().toUpperCase() : null;

    // Construir query usando a view vehicles_with_auctioneer diretamente
    let query = supabase
      .from('vehicles_with_auctioneer')
      .select('*', { count: 'exact' });

    // Aplicar filtros - usando colunas em inglês da view
    if (filters.q) {
      // Suportar múltiplos termos de busca (array)
      const searchTerms = Array.isArray(filters.q) ? filters.q : [filters.q];
      const trimmedTerms = searchTerms
        .map(term => (typeof term === 'string' ? term.trim() : ''))
        .filter(term => term.length > 0);
      
      if (trimmedTerms.length > 0) {
        // Se houver múltiplos termos, usar OR para buscar qualquer um deles
        if (trimmedTerms.length === 1) {
          query = query.ilike('title', `%${trimmedTerms[0]}%`);
        } else {
          // Construir string OR para múltiplos termos
          // Formato: title.ilike.%termo1%,title.ilike.%termo2%
          const orConditions = trimmedTerms
            .map((term) => `title.ilike.%${term}%`)
            .join(',');
          query = query.or(orConditions);
        }
      }
    }

    if (normalizedState) {
      query = query.eq('state', normalizedState);
    }

    if (filters.city) {
      query = query.eq('city', filters.city);
    }

    // Nota: Filtro de data de leilão é feito no scrape, não aqui nos filtros
    // Os filtros devem buscar exatamente o que está na planilha

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

    if (filters.auctioneer && filters.auctioneer.length > 0) {
      query = query.in('auctioneer_name', filters.auctioneer);
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
        upgradeRequired: false,
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
      upgradeRequired: false,
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
      upgradeRequired: false,
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
      .select('*', { count: 'exact', head: true });

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
      .not('brand', 'is', null);

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
      auctioneers: auctioneers.length,
    });

    return {
      states,
      citiesByState,
      auctioneers,
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
  titles: string[];
  total: number;
}

/**
 * Busca sugestões de busca em tempo real para autocomplete
 * Retorna apenas títulos de veículos que correspondem ao termo de busca
 */
export async function getSearchSuggestions(query: string): Promise<SearchSuggestions> {
  const supabase = await createClient();

  if (!query || query.trim().length < 2) {
    return {
      titles: [],
      total: 0,
    };
  }

  const searchTerm = query.trim();

  try {
    // Buscar total de resultados primeiro
    const { count: totalCount } = await supabase
      .from('vehicles_with_auctioneer')
      .select('*', { count: 'exact', head: true })
      .not('title', 'is', null)
      .ilike('title', `%${searchTerm}%`);

    const total = totalCount || 0;

    // Buscar títulos que correspondem (mais relevantes primeiro) - limitado a 10 para o dropdown
    const { data: titlesData } = await supabase
      .from('vehicles_with_auctioneer')
      .select('title')
      .not('title', 'is', null)
      .ilike('title', `%${searchTerm}%`)
      .order('deal_score', { ascending: false, nullsFirst: false })
      .limit(10);

    const titles: string[] = Array.from(
      new Set(
        (titlesData || [])
          .map((row: any) => row?.title)
          .filter((title: any): title is string => typeof title === 'string' && title.trim() !== '')
      )
    ).slice(0, 10);

    return {
      titles,
      total,
    };
  } catch (error) {
    console.error('[getSearchSuggestions] Erro:', error);
    return {
      titles: [],
      total: 0,
    };
  }
}
