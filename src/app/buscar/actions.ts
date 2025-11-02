'use server';

import { createClient } from '@/lib/supabase/server';

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
      .select('marca')
      .not('marca', 'is', null);

    const uniqueBrands = new Set(brands?.map(v => v.marca));

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
    const { data: brandsData } = await supabase
      .from('vehicles')
      .select('marca')
      .not('marca', 'is', null);

    const brands = Array.from(new Set(brandsData?.map(v => v.marca).filter(Boolean) || []))
      .sort();

    const { data: modelsData } = await supabase
      .from('vehicles')
      .select('modelo')
      .not('modelo', 'is', null);

    const models = Array.from(new Set(modelsData?.map(v => v.modelo).filter(Boolean) || []))
      .sort();

    const { data: statesData } = await supabase
      .from('vehicles')
      .select('estado')
      .not('estado', 'is', null);

    const states = Array.from(new Set(statesData?.map(v => v.estado).filter(Boolean) || []))
      .sort();

    const { data: citiesData } = await supabase
      .from('vehicles')
      .select('cidade, estado')
      .not('cidade', 'is', null);

    const citiesByState: Record<string, string[]> = {};
    citiesData?.forEach(v => {
      if (v.cidade && v.estado) {
        if (!citiesByState[v.estado]) {
          citiesByState[v.estado] = [];
        }
        if (!citiesByState[v.estado].includes(v.cidade)) {
          citiesByState[v.estado].push(v.cidade);
        }
      }
    });

    Object.keys(citiesByState).forEach(state => {
      citiesByState[state].sort();
    });

    const { data: auctioneersData } = await supabase
      .from('vehicles')
      .select('leiloeiro')
      .not('leiloeiro', 'is', null);

    const auctioneers = Array.from(new Set(auctioneersData?.map(v => v.leiloeiro).filter(Boolean) || []))
      .sort();

    const { data: fuelData } = await supabase
      .from('vehicles')
      .select('combustivel')
      .not('combustivel', 'is', null);

    const fuels = Array.from(new Set(fuelData?.map(v => v.combustivel).filter(Boolean) || []))
      .sort();

    const { data: transmissionData } = await supabase
      .from('vehicles')
      .select('cambio')
      .not('cambio', 'is', null);

    const transmissions = Array.from(new Set(transmissionData?.map(v => v.cambio).filter(Boolean) || []))
      .sort();

    const { data: colorsData } = await supabase
      .from('vehicles')
      .select('cor')
      .not('cor', 'is', null);

    const colors = Array.from(new Set(colorsData?.map(v => v.cor).filter(Boolean) || []))
      .sort();

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
    console.error('Erro ao buscar opÃ§Ãµes de filtro:', error);
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
    const { data } = await supabase
      .from('vehicles')
      .select('modelo')
      .eq('marca', brand)
      .not('modelo', 'is', null);

    const models = Array.from(new Set(data?.map(v => v.modelo).filter(Boolean) || []))
      .sort();

    return models;
  } catch (error) {
    console.error('Erro ao buscar modelos:', error);
    return [];
  }
}
