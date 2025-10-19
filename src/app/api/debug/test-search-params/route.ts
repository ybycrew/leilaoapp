import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const tests: { [key: string]: any } = {};

    // Test 1: Busca sem filtros (deve retornar todos)
    try {
      const { data, error } = await supabase.rpc('search_vehicles', {
        p_search_text: null,
        p_states: null,
        p_cities: null,
        p_brands: null,
        p_models: null,
        p_min_year: null,
        p_max_year: null,
        p_min_price: null,
        p_max_price: null,
        p_vehicle_types: null,
        p_fuel_types: null,
        p_transmissions: null,
        p_min_mileage: null,
        p_max_mileage: null,
        p_auction_types: null,
        p_has_financing: null,
        p_conditions: null,
        p_sort_by: 'auction_date',
        p_sort_order: 'asc',
        p_limit: 10,
        p_offset: 0,
      });
      tests.noFilters = { success: !error, count: data?.length || 0, error: error, data: data };
    } catch (e: any) {
      tests.noFilters = { success: false, count: 0, error: e.message, data: null };
    }

    // Test 2: Busca por texto "honda"
    try {
      const { data, error } = await supabase.rpc('search_vehicles', {
        p_search_text: 'honda',
        p_states: null,
        p_cities: null,
        p_brands: null,
        p_models: null,
        p_min_year: null,
        p_max_year: null,
        p_min_price: null,
        p_max_price: null,
        p_vehicle_types: null,
        p_fuel_types: null,
        p_transmissions: null,
        p_min_mileage: null,
        p_max_mileage: null,
        p_auction_types: null,
        p_has_financing: null,
        p_conditions: null,
        p_sort_by: 'auction_date',
        p_sort_order: 'asc',
        p_limit: 10,
        p_offset: 0,
      });
      tests.hondaSearch = { success: !error, count: data?.length || 0, error: error, data: data };
    } catch (e: any) {
      tests.hondaSearch = { success: false, count: 0, error: e.message, data: null };
    }

    // Test 3: Busca por estado "SP"
    try {
      const { data, error } = await supabase.rpc('search_vehicles', {
        p_search_text: null,
        p_states: ['SP'],
        p_cities: null,
        p_brands: null,
        p_models: null,
        p_min_year: null,
        p_max_year: null,
        p_min_price: null,
        p_max_price: null,
        p_vehicle_types: null,
        p_fuel_types: null,
        p_transmissions: null,
        p_min_mileage: null,
        p_max_mileage: null,
        p_auction_types: null,
        p_has_financing: null,
        p_conditions: null,
        p_sort_by: 'auction_date',
        p_sort_order: 'asc',
        p_limit: 10,
        p_offset: 0,
      });
      tests.spState = { success: !error, count: data?.length || 0, error: error, data: data };
    } catch (e: any) {
      tests.spState = { success: false, count: 0, error: e.message, data: null };
    }

    return NextResponse.json({
      success: true,
      tests,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
