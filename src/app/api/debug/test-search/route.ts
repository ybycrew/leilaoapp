import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Endpoint de debug para testar a busca (sem autenticação)
 */
export async function GET() {
  try {
    // Inicializar Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Variáveis do Supabase não configuradas' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verificar se há veículos na tabela
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, title, brand, model, is_active')
      .limit(5);

    // 2. Verificar se há leiloeiros
    const { data: auctioneers, error: auctioneersError } = await supabase
      .from('auctioneers')
      .select('id, name');

    // 3. Testar a função search_vehicles
    const { data: searchResults, error: searchError } = await supabase.rpc('search_vehicles', {
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
      p_limit: 5,
      p_offset: 0
    });

    // 4. Testar busca com texto
    const { data: textSearch, error: textError } = await supabase.rpc('search_vehicles', {
      p_search_text: 'volkswagen',
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
      p_limit: 5,
      p_offset: 0
    });

    // 5. Verificar JOIN entre vehicles e auctioneers
    const { data: joinTest, error: joinError } = await supabase
      .from('vehicles')
      .select(`
        id,
        title,
        brand,
        model,
        is_active,
        auctioneers (
          id,
          name
        )
      `)
      .limit(3);

    return NextResponse.json({
      success: true,
      tests: {
        vehicles: {
          success: !vehiclesError,
          count: vehicles?.length || 0,
          error: vehiclesError,
          data: vehicles
        },
        auctioneers: {
          success: !auctioneersError,
          count: auctioneers?.length || 0,
          error: auctioneersError,
          data: auctioneers
        },
        searchFunction: {
          success: !searchError,
          count: searchResults?.length || 0,
          error: searchError,
          data: searchResults
        },
        textSearch: {
          success: !textError,
          count: textSearch?.length || 0,
          error: textError,
          data: textSearch
        },
        joinTest: {
          success: !joinError,
          count: joinTest?.length || 0,
          error: joinError,
          data: joinTest
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Erro interno',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
