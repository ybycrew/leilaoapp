import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const correctedSql = `
-- Primeiro, delete a função existente
DROP FUNCTION IF EXISTS search_vehicles(text,text[],text[],text[],text[],integer,integer,numeric,numeric,text[],text[],text[],integer,integer,text[],boolean,text[],text,text,integer,integer);

-- Depois, crie a função corrigida com os tipos corretos
CREATE OR REPLACE FUNCTION search_vehicles(
    p_search_text TEXT DEFAULT NULL,
    p_states TEXT[] DEFAULT NULL,
    p_cities TEXT[] DEFAULT NULL,
    p_brands TEXT[] DEFAULT NULL,
    p_models TEXT[] DEFAULT NULL,
    p_min_year INTEGER DEFAULT NULL,
    p_max_year INTEGER DEFAULT NULL,
    p_min_price DECIMAL DEFAULT NULL,
    p_max_price DECIMAL DEFAULT NULL,
    p_vehicle_types TEXT[] DEFAULT NULL,
    p_fuel_types TEXT[] DEFAULT NULL,
    p_transmissions TEXT[] DEFAULT NULL,
    p_min_mileage INTEGER DEFAULT NULL,
    p_max_mileage INTEGER DEFAULT NULL,
    p_auction_types TEXT[] DEFAULT NULL,
    p_has_financing BOOLEAN DEFAULT NULL,
    p_conditions TEXT[] DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'auction_date',
    p_sort_order TEXT DEFAULT 'asc',
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    auctioneer_id UUID,
    auctioneer_name TEXT,
    auctioneer_logo TEXT,
    title TEXT,
    brand TEXT,
    model TEXT,
    version TEXT,
    year_model INTEGER,
    vehicle_type TEXT,
    color TEXT,
    fuel_type TEXT,
    transmission TEXT,
    mileage INTEGER,
    state TEXT,
    city TEXT,
    current_bid DECIMAL,
    minimum_bid DECIMAL,
    appraised_value DECIMAL,
    auction_date TIMESTAMP WITH TIME ZONE,
    auction_type TEXT,
    has_financing BOOLEAN,
    condition TEXT,
    original_url TEXT,
    thumbnail_url TEXT,
    fipe_price DECIMAL,
    fipe_discount_percentage DECIMAL,
    deal_score INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.auctioneer_id,
        a.name as auctioneer_name,
        a.logo_url as auctioneer_logo,
        v.title,
        v.brand,
        v.model,
        v.version,
        v.year_model,
        v.vehicle_type,
        v.color,
        v.fuel_type,
        v.transmission,
        v.mileage,
        v.state,
        v.city,
        v.current_bid,
        v.minimum_bid,
        v.appraised_value,
        v.auction_date,
        v.auction_type,
        v.has_financing,
        v.condition,
        v.original_url,
        v.thumbnail_url,
        v.fipe_price,
        v.fipe_discount_percentage,
        v.deal_score
    FROM vehicles v
    JOIN auctioneers a ON v.auctioneer_id = a.id
    WHERE v.is_active = true
    AND (p_search_text IS NULL OR unaccent(LOWER(v.title || ' ' || v.brand || ' ' || v.model)) LIKE unaccent(LOWER('%' || p_search_text || '%')))
    AND (p_states IS NULL OR v.state = ANY(p_states))
    AND (p_cities IS NULL OR v.city = ANY(p_cities))
    AND (p_brands IS NULL OR v.brand = ANY(p_brands))
    AND (p_models IS NULL OR v.model = ANY(p_models))
    AND (p_min_year IS NULL OR v.year_model >= p_min_year)
    AND (p_max_year IS NULL OR v.year_model <= p_max_year)
    AND (p_min_price IS NULL OR v.current_bid >= p_min_price)
    AND (p_max_price IS NULL OR v.current_bid <= p_max_price)
    AND (p_vehicle_types IS NULL OR v.vehicle_type = ANY(p_vehicle_types))
    AND (p_fuel_types IS NULL OR v.fuel_type = ANY(p_fuel_types))
    AND (p_transmissions IS NULL OR v.transmission = ANY(p_transmissions))
    AND (p_min_mileage IS NULL OR v.mileage >= p_min_mileage)
    AND (p_max_mileage IS NULL OR v.mileage <= p_max_mileage)
    AND (p_auction_types IS NULL OR v.auction_type = ANY(p_auction_types))
    AND (p_has_financing IS NULL OR v.has_financing = p_has_financing)
    AND (p_conditions IS NULL OR v.condition = ANY(p_conditions))
    ORDER BY 
        CASE WHEN p_sort_by = 'deal_score' AND p_sort_order = 'asc' THEN v.deal_score END ASC,
        CASE WHEN p_sort_by = 'deal_score' AND p_sort_order = 'desc' THEN v.deal_score END DESC,
        CASE WHEN p_sort_by = 'price_asc' THEN v.current_bid END ASC,
        CASE WHEN p_sort_by = 'price_desc' THEN v.current_bid END DESC,
        CASE WHEN p_sort_by = 'date_asc' THEN v.auction_date END ASC,
        CASE WHEN p_sort_by = 'date_desc' THEN v.auction_date END DESC,
        v.auction_date ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
  `;

  return NextResponse.json({
    success: true,
    message: 'SQL final da função search_vehicles corrigida - deal_score como INTEGER',
    sql: correctedSql,
  });
}
