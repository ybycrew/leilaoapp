import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Endpoint de debug para testar a função search_vehicles
 */
export async function POST(request: NextRequest) {
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

    // Testar busca simples
    console.log('Testando busca simples...');
    const { data: simpleSearch, error: simpleError } = await supabase
      .from('vehicles')
      .select('*')
      .limit(5);

    if (simpleError) {
      return NextResponse.json(
        { error: 'Erro na busca simples', details: simpleError },
        { status: 500 }
      );
    }

    // Testar função search_vehicles
    console.log('Testando função search_vehicles...');
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
      p_limit: 10,
      p_offset: 0
    });

    // Testar busca com texto
    console.log('Testando busca com texto "volkswagen"...');
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
      p_limit: 10,
      p_offset: 0
    });

    return NextResponse.json({
      success: true,
      tests: {
        simpleSearch: {
          success: !simpleError,
          count: simpleSearch?.length || 0,
          error: simpleError,
          sample: simpleSearch?.[0] || null
        },
        searchFunction: {
          success: !searchError,
          count: searchResults?.length || 0,
          error: searchError,
          sample: searchResults?.[0] || null
        },
        textSearch: {
          success: !textError,
          count: textSearch?.length || 0,
          error: textError,
          sample: textSearch?.[0] || null
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
