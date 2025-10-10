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
    // Chamar função search_vehicles do banco
    const { data, error } = await supabase.rpc('search_vehicles', {
      p_search_text: filters.q || null,
      p_states: filters.state ? [filters.state] : null,
      p_cities: filters.city ? [filters.city] : null,
      p_vehicle_types: filters.vehicleType || null,
      p_min_year: filters.minYear || null,
      p_max_year: filters.maxYear || null,
      p_min_price: filters.minPrice || null,
      p_max_price: filters.maxPrice || null,
      p_order_by: filters.orderBy || 'deal_score',
      p_limit: filters.limit || 50,
      p_offset: filters.offset || 0,
    });

    if (error) {
      console.error('Erro ao buscar veículos:', error);
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
      error: error.message || 'Erro ao buscar veículos' 
    };
  }
}

export async function getVehicleStats() {
  const supabase = await createClient();

  try {
    // Contar total de veículos
    const { count } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Buscar marcas distintas
    const { data: brands } = await supabase
      .from('vehicles')
      .select('brand')
      .eq('is_active', true)
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

