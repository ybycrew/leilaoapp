import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCachedVehicles, setCachedVehicles } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse filters from query params
    const filters = {
      estado: searchParams.get('estado'),
      cidade: searchParams.get('cidade'),
      tipo_veiculo: searchParams.get('tipo_veiculo'),
      marca: searchParams.get('marca'),
      ano_min: searchParams.get('ano_min'),
      ano_max: searchParams.get('ano_max'),
      preco_min: searchParams.get('preco_min'),
      preco_max: searchParams.get('preco_max'),
      search: searchParams.get('search'),
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    };

    // Create cache key
    const cacheKey = `vehicles:${JSON.stringify(filters)}`;

    // Try to get from cache
    const cached = await getCachedVehicles(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Get from database
    const supabase = await createClient();
    
    let query = supabase
      .from('vehicles')
      .select('*', { count: 'exact' })
      .order('deal_score', { ascending: false });

    // Apply filters
    if (filters.estado) {
      query = query.eq('estado', filters.estado);
    }
    if (filters.cidade) {
      query = query.eq('cidade', filters.cidade);
    }
    if (filters.tipo_veiculo) {
      query = query.eq('tipo_veiculo', filters.tipo_veiculo);
    }
    if (filters.marca) {
      query = query.ilike('marca', `%${filters.marca}%`);
    }
    if (filters.ano_min) {
      query = query.gte('ano', parseInt(filters.ano_min));
    }
    if (filters.ano_max) {
      query = query.lte('ano', parseInt(filters.ano_max));
    }
    if (filters.preco_min) {
      query = query.gte('preco_atual', parseFloat(filters.preco_min));
    }
    if (filters.preco_max) {
      query = query.lte('preco_atual', parseFloat(filters.preco_max));
    }
    if (filters.search) {
      query = query.or(`titulo.ilike.%${filters.search}%,modelo.ilike.%${filters.search}%`);
    }

    // Pagination
    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const response = {
      data,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.limit),
      },
    };

    // Cache for 1 hour
    await setCachedVehicles(cacheKey, response, 3600);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
