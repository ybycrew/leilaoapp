import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCachedVehicles, setCachedVehicles } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse filters from query params (support both old Portuguese and new English names for backward compatibility)
    const filters = {
      state: searchParams.get('state') || searchParams.get('estado'),
      city: searchParams.get('city') || searchParams.get('cidade'),
      vehicle_type: searchParams.get('vehicle_type') || searchParams.get('vehicleType') || searchParams.get('tipo_veiculo'),
      brand: searchParams.get('brand') || searchParams.get('marca'),
      model: searchParams.get('model'),
      year_min: searchParams.get('year_min') || searchParams.get('minYear') || searchParams.get('ano_min'),
      year_max: searchParams.get('year_max') || searchParams.get('maxYear') || searchParams.get('ano_max'),
      price_min: searchParams.get('price_min') || searchParams.get('minPrice') || searchParams.get('preco_min'),
      price_max: searchParams.get('price_max') || searchParams.get('maxPrice') || searchParams.get('preco_max'),
      fuel_type: searchParams.get('fuel_type') || searchParams.get('fuelType'),
      mileage: searchParams.get('mileage') || searchParams.get('maxMileage'),
      color: searchParams.get('color'),
      license_plate: searchParams.get('license_plate') || searchParams.get('licensePlateEnd'),
      search: searchParams.get('search') || searchParams.get('q'),
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

    // Get from database - using vehicles_with_auctioneer view
    const supabase = await createClient();
    
    let query = supabase
      .from('vehicles_with_auctioneer')
      .select('*', { count: 'exact' })
      .order('deal_score', { ascending: false });

    // Apply filters - using English column names
    if (filters.state) {
      query = query.eq('state', filters.state);
    }
    if (filters.city) {
      query = query.eq('city', filters.city);
    }
    if (filters.vehicle_type) {
      query = query.eq('vehicle_type', filters.vehicle_type);
    }
    if (filters.brand) {
      query = query.ilike('brand', `%${filters.brand}%`);
    }
    if (filters.model) {
      query = query.ilike('model', `%${filters.model}%`);
    }
    if (filters.year_min) {
      query = query.gte('year_manufacture', parseInt(filters.year_min));
    }
    if (filters.year_max) {
      query = query.lte('year_manufacture', parseInt(filters.year_max));
    }
    if (filters.price_min) {
      query = query.gte('current_bid', parseFloat(filters.price_min));
    }
    if (filters.price_max) {
      query = query.lte('current_bid', parseFloat(filters.price_max));
    }
    if (filters.fuel_type) {
      query = query.eq('fuel_type', filters.fuel_type);
    }
    if (filters.mileage) {
      query = query.lte('mileage', parseInt(filters.mileage));
    }
    if (filters.color) {
      query = query.ilike('color', `%${filters.color}%`);
    }
    if (filters.license_plate) {
      query = query.ilike('license_plate', `%${filters.license_plate}`);
    }

    // Apenas leilões futuros (evita itens vencidos)
    query = query.gte('auction_date', new Date().toISOString());

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,model.ilike.%${filters.search}%,brand.ilike.%${filters.search}%`);
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
