import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Simular exatamente o que a página /buscar faz
    const filters = {
      q: undefined,
      state: undefined,
      city: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      minYear: undefined,
      maxYear: undefined,
      orderBy: 'deal_score' as 'deal_score' | 'price_asc' | 'price_desc' | 'date_asc' | 'date_desc',
      limit: 50,
      offset: 0,
    };

    console.log('Testando busca com filtros:', filters);

    const { data, error } = await supabase.rpc('search_vehicles', {
      p_search_text: filters.q || null,
      p_states: filters.state ? [filters.state] : null,
      p_cities: filters.city ? [filters.city] : null,
      p_brands: null,
      p_models: null,
      p_min_year: filters.minYear || null,
      p_max_year: filters.maxYear || null,
      p_min_price: filters.minPrice || null,
      p_max_price: filters.maxPrice || null,
      p_vehicle_types: null,
      p_fuel_types: null,
      p_transmissions: null,
      p_min_mileage: null,
      p_max_mileage: null,
      p_auction_types: null,
      p_has_financing: null,
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

    console.log('Resultado da busca:', { data: data?.length, error });

    return NextResponse.json({
      success: !error,
      filters,
      result: {
        vehicles: data || [],
        total: data?.length || 0,
        error: error?.message || null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erro no teste da página buscar:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
