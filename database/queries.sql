-- ============================================
-- QUERIES ÚTEIS - YBYBID
-- Consultas SQL prontas para uso nas APIs
-- ============================================

-- ============================================
-- 1. BUSCA DE VEÍCULOS COM FILTROS
-- ============================================

-- Busca completa de veículos com todos os filtros possíveis
-- Use este template e adicione WHERE dinâmico conforme filtros aplicados
CREATE OR REPLACE FUNCTION search_vehicles(
    p_search_text TEXT DEFAULT NULL,
    p_states TEXT[] DEFAULT NULL,
    p_cities TEXT[] DEFAULT NULL,
    p_vehicle_types TEXT[] DEFAULT NULL,
    p_brands TEXT[] DEFAULT NULL,
    p_models TEXT[] DEFAULT NULL,
    p_min_year INTEGER DEFAULT NULL,
    p_max_year INTEGER DEFAULT NULL,
    p_min_price DECIMAL DEFAULT NULL,
    p_max_price DECIMAL DEFAULT NULL,
    p_fuel_types TEXT[] DEFAULT NULL,
    p_transmissions TEXT[] DEFAULT NULL,
    p_colors TEXT[] DEFAULT NULL,
    p_auction_types TEXT[] DEFAULT NULL,
    p_has_financing BOOLEAN DEFAULT NULL,
    p_min_deal_score INTEGER DEFAULT NULL,
    p_max_mileage INTEGER DEFAULT NULL,
    p_auction_date_from TIMESTAMP DEFAULT NULL,
    p_auction_date_to TIMESTAMP DEFAULT NULL,
    p_order_by TEXT DEFAULT 'deal_score', -- 'deal_score', 'price_asc', 'price_desc', 'date_asc', 'date_desc'
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
    fipe_price DECIMAL,
    fipe_discount_percentage DECIMAL,
    auction_date TIMESTAMP WITH TIME ZONE,
    auction_type TEXT,
    has_financing BOOLEAN,
    deal_score INTEGER,
    original_url TEXT,
    thumbnail_url TEXT,
    favorites_count INTEGER,
    views_count INTEGER
) AS $$
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
        v.fipe_price,
        v.fipe_discount_percentage,
        v.auction_date,
        v.auction_type,
        v.has_financing,
        v.deal_score,
        v.original_url,
        v.thumbnail_url,
        v.favorites_count,
        v.views_count
    FROM public.vehicles v
    INNER JOIN public.auctioneers a ON v.auctioneer_id = a.id
    WHERE 
        v.is_active = true
        AND a.is_active = true
        AND (p_search_text IS NULL OR 
             to_tsvector('portuguese', v.title || ' ' || v.brand || ' ' || v.model) @@ plainto_tsquery('portuguese', p_search_text))
        AND (p_states IS NULL OR v.state = ANY(p_states))
        AND (p_cities IS NULL OR v.city = ANY(p_cities))
        AND (p_vehicle_types IS NULL OR v.vehicle_type = ANY(p_vehicle_types))
        AND (p_brands IS NULL OR v.brand = ANY(p_brands))
        AND (p_models IS NULL OR v.model = ANY(p_models))
        AND (p_min_year IS NULL OR v.year_model >= p_min_year)
        AND (p_max_year IS NULL OR v.year_model <= p_max_year)
        AND (p_min_price IS NULL OR v.current_bid >= p_min_price)
        AND (p_max_price IS NULL OR v.current_bid <= p_max_price)
        AND (p_fuel_types IS NULL OR v.fuel_type = ANY(p_fuel_types))
        AND (p_transmissions IS NULL OR v.transmission = ANY(p_transmissions))
        AND (p_colors IS NULL OR v.color = ANY(p_colors))
        AND (p_auction_types IS NULL OR v.auction_type = ANY(p_auction_types))
        AND (p_has_financing IS NULL OR v.has_financing = p_has_financing)
        AND (p_min_deal_score IS NULL OR v.deal_score >= p_min_deal_score)
        AND (p_max_mileage IS NULL OR v.mileage <= p_max_mileage)
        AND (p_auction_date_from IS NULL OR v.auction_date >= p_auction_date_from)
        AND (p_auction_date_to IS NULL OR v.auction_date <= p_auction_date_to)
    ORDER BY
        CASE WHEN p_order_by = 'deal_score' THEN v.deal_score END DESC,
        CASE WHEN p_order_by = 'price_asc' THEN v.current_bid END ASC,
        CASE WHEN p_order_by = 'price_desc' THEN v.current_bid END DESC,
        CASE WHEN p_order_by = 'date_asc' THEN v.auction_date END ASC,
        CASE WHEN p_order_by = 'date_desc' THEN v.auction_date END DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 2. DETALHES COMPLETOS DE UM VEÍCULO
-- ============================================

CREATE OR REPLACE FUNCTION get_vehicle_details(p_vehicle_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    v_vehicle JSON;
    v_images JSON;
    v_similar JSON;
    v_brand TEXT;
    v_model TEXT;
BEGIN
    -- Buscar marca e modelo do veículo
    SELECT brand, model INTO v_brand, v_model
    FROM public.vehicles
    WHERE id = p_vehicle_id;
    
    -- Buscar dados do veículo
    SELECT row_to_json(v_data) INTO v_vehicle
    FROM (
        SELECT 
            v.*,
            a.name as auctioneer_name,
            a.website_url as auctioneer_website,
            a.logo_url as auctioneer_logo
        FROM public.vehicles v
        INNER JOIN public.auctioneers a ON v.auctioneer_id = a.id
        WHERE v.id = p_vehicle_id
    ) v_data;
    
    -- Buscar imagens
    SELECT COALESCE(json_agg(row_to_json(img)), '[]'::json) INTO v_images
    FROM (
        SELECT url, is_primary, display_order
        FROM public.vehicle_images
        WHERE vehicle_id = p_vehicle_id
        ORDER BY is_primary DESC, display_order ASC
    ) img;
    
    -- Buscar veículos similares
    SELECT COALESCE(json_agg(row_to_json(sim)), '[]'::json) INTO v_similar
    FROM (
        SELECT 
            id, title, brand, model, year_model, 
            current_bid, deal_score, thumbnail_url
        FROM public.vehicles
        WHERE 
            id != p_vehicle_id
            AND is_active = true
            AND brand = v_brand
            AND model = v_model
        ORDER BY deal_score DESC
        LIMIT 6
    ) sim;
    
    -- Construir resultado final
    result := json_build_object(
        'vehicle', v_vehicle,
        'images', v_images,
        'similar_vehicles', v_similar
    );
    
    -- Incrementar contador de visualizações
    UPDATE public.vehicles 
    SET views_count = views_count + 1 
    WHERE id = p_vehicle_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 3. VERIFICAR SE USUÁRIO PODE FAZER BUSCA
-- ============================================

CREATE OR REPLACE FUNCTION can_user_search(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_search_count INTEGER;
    v_search_limit INTEGER;
    v_plan_name TEXT;
    v_subscription_status TEXT;
    result JSON;
BEGIN
    SELECT 
        p.search_count,
        pl.search_limit,
        pl.name,
        COALESCE(s.status, 'none')
    INTO 
        v_search_count,
        v_search_limit,
        v_plan_name,
        v_subscription_status
    FROM public.profiles p
    LEFT JOIN public.subscriptions s ON p.id = s.user_id AND s.status = 'active'
    LEFT JOIN public.plans pl ON s.plan_id = pl.id
    WHERE p.id = p_user_id;
    
    -- Se não tem plano ativo, usar plano gratuito
    IF v_plan_name IS NULL THEN
        SELECT search_limit, name INTO v_search_limit, v_plan_name
        FROM public.plans
        WHERE interval = 'free';
    END IF;
    
    result := json_build_object(
        'can_search', (v_search_limit IS NULL OR v_search_count < v_search_limit),
        'searches_used', v_search_count,
        'search_limit', v_search_limit,
        'plan_name', v_plan_name,
        'subscription_status', v_subscription_status
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 4. INCREMENTAR CONTADOR DE BUSCAS
-- ============================================

CREATE OR REPLACE FUNCTION increment_search_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET search_count = search_count + 1
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 5. OBTER FAVORITOS DO USUÁRIO
-- ============================================

CREATE OR REPLACE FUNCTION get_user_favorites(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_agg(row_to_json(fav_data))
        FROM (
            SELECT 
                f.id as favorite_id,
                f.notes,
                f.created_at as favorited_at,
                v.id as vehicle_id,
                v.title,
                v.brand,
                v.model,
                v.year_model,
                v.current_bid,
                v.fipe_price,
                v.fipe_discount_percentage,
                v.deal_score,
                v.auction_date,
                v.state,
                v.city,
                v.thumbnail_url,
                v.original_url,
                a.name as auctioneer_name
            FROM public.favorites f
            INNER JOIN public.vehicles v ON f.vehicle_id = v.id
            INNER JOIN public.auctioneers a ON v.auctioneer_id = a.id
            WHERE 
                f.user_id = p_user_id
                AND v.is_active = true
            ORDER BY f.created_at DESC
            LIMIT p_limit
            OFFSET p_offset
        ) fav_data
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 6. OBTER HISTÓRICO DE BUSCAS
-- ============================================

CREATE OR REPLACE FUNCTION get_search_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_agg(row_to_json(history_data))
        FROM (
            SELECT 
                id,
                filters,
                results_count,
                created_at
            FROM public.search_history
            WHERE user_id = p_user_id
            ORDER BY created_at DESC
            LIMIT p_limit
        ) history_data
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 7. ESTATÍSTICAS DO DASHBOARD
-- ============================================

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'total_vehicles', (SELECT COUNT(*) FROM public.vehicles WHERE is_active = true),
        'total_auctioneers', (SELECT COUNT(*) FROM public.auctioneers WHERE is_active = true),
        'vehicles_today', (
            SELECT COUNT(*) 
            FROM public.vehicles 
            WHERE is_active = true 
            AND DATE(auction_date) = CURRENT_DATE
        ),
        'best_deals', (
            SELECT json_agg(row_to_json(deals))
            FROM (
                SELECT 
                    id, title, brand, model, current_bid, 
                    fipe_price, deal_score, thumbnail_url
                FROM public.vehicles
                WHERE is_active = true AND deal_score >= 80
                ORDER BY deal_score DESC
                LIMIT 10
            ) deals
        ),
        'recent_vehicles', (
            SELECT json_agg(row_to_json(recent))
            FROM (
                SELECT 
                    id, title, brand, model, current_bid, 
                    deal_score, thumbnail_url, scraped_at
                FROM public.vehicles
                WHERE is_active = true
                ORDER BY scraped_at DESC
                LIMIT 10
            ) recent
        ),
        'vehicles_by_state', (
            SELECT json_object_agg(state, count)
            FROM (
                SELECT state, COUNT(*) as count
                FROM public.vehicles
                WHERE is_active = true
                GROUP BY state
                ORDER BY count DESC
            ) by_state
        ),
        'vehicles_by_type', (
            SELECT json_object_agg(vehicle_type, count)
            FROM (
                SELECT vehicle_type, COUNT(*) as count
                FROM public.vehicles
                WHERE is_active = true
                GROUP BY vehicle_type
                ORDER BY count DESC
            ) by_type
        )
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 8. OBTER FILTROS DISPONÍVEIS
-- ============================================

CREATE OR REPLACE FUNCTION get_available_filters()
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'states', (
            SELECT json_agg(DISTINCT state ORDER BY state)
            FROM public.vehicles
            WHERE is_active = true
        ),
        'vehicle_types', (
            SELECT json_agg(DISTINCT vehicle_type ORDER BY vehicle_type)
            FROM public.vehicles
            WHERE is_active = true AND vehicle_type IS NOT NULL
        ),
        'brands', (
            SELECT json_agg(row_to_json(brand_data) ORDER BY brand)
            FROM (
                SELECT 
                    brand, 
                    COUNT(*) as count
                FROM public.vehicles
                WHERE is_active = true
                GROUP BY brand
                HAVING COUNT(*) > 0
            ) brand_data
        ),
        'fuel_types', (
            SELECT json_agg(DISTINCT fuel_type ORDER BY fuel_type)
            FROM public.vehicles
            WHERE is_active = true AND fuel_type IS NOT NULL
        ),
        'transmissions', (
            SELECT json_agg(DISTINCT transmission ORDER BY transmission)
            FROM public.vehicles
            WHERE is_active = true AND transmission IS NOT NULL
        ),
        'auction_types', (
            SELECT json_agg(DISTINCT auction_type ORDER BY auction_type)
            FROM public.vehicles
            WHERE is_active = true AND auction_type IS NOT NULL
        ),
        'year_range', (
            SELECT json_build_object(
                'min', MIN(year_model),
                'max', MAX(year_model)
            )
            FROM public.vehicles
            WHERE is_active = true AND year_model IS NOT NULL
        ),
        'price_range', (
            SELECT json_build_object(
                'min', MIN(current_bid),
                'max', MAX(current_bid)
            )
            FROM public.vehicles
            WHERE is_active = true AND current_bid IS NOT NULL
        )
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 9. VERIFICAR VEÍCULOS PARA ALERTAS
-- ============================================

CREATE OR REPLACE FUNCTION check_alerts_for_new_vehicles()
RETURNS VOID AS $$
DECLARE
    filter_record RECORD;
    vehicle_record RECORD;
BEGIN
    -- Percorrer todos os filtros salvos com alerta ativo
    FOR filter_record IN 
        SELECT sf.id, sf.user_id, sf.filters
        FROM public.saved_filters sf
        WHERE sf.alert_enabled = true
    LOOP
        -- Buscar veículos novos que correspondem ao filtro
        -- Aqui você implementaria a lógica de matching baseado no JSONB filters
        -- Por simplicidade, este é um exemplo básico
        
        FOR vehicle_record IN
            SELECT v.id
            FROM public.vehicles v
            WHERE 
                v.is_active = true
                AND v.created_at > NOW() - INTERVAL '24 hours'
                -- Adicione aqui a lógica de matching com filter_record.filters
                AND NOT EXISTS (
                    SELECT 1 FROM public.alerts a
                    WHERE a.vehicle_id = v.id 
                    AND a.user_id = filter_record.user_id
                )
        LOOP
            -- Criar alerta
            INSERT INTO public.alerts (user_id, saved_filter_id, vehicle_id)
            VALUES (filter_record.user_id, filter_record.id, vehicle_record.id);
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 10. LIMPAR VEÍCULOS ANTIGOS
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_vehicles()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Desativar veículos com leilão passado há mais de 30 dias
    UPDATE public.vehicles
    SET is_active = false
    WHERE 
        is_active = true
        AND auction_date < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 11. ATUALIZAR PREÇO FIPE DE UM VEÍCULO
-- ============================================

CREATE OR REPLACE FUNCTION update_vehicle_fipe_price(
    p_vehicle_id UUID,
    p_fipe_price DECIMAL,
    p_fipe_code TEXT
)
RETURNS VOID AS $$
DECLARE
    v_current_bid DECIMAL;
BEGIN
    SELECT current_bid INTO v_current_bid
    FROM public.vehicles
    WHERE id = p_vehicle_id;
    
    UPDATE public.vehicles
    SET 
        fipe_price = p_fipe_price,
        fipe_code = p_fipe_code,
        fipe_discount_percentage = CASE 
            WHEN p_fipe_price > 0 THEN ((p_fipe_price - v_current_bid) / p_fipe_price * 100)
            ELSE 0
        END
    WHERE id = p_vehicle_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 12. CALCULAR DEAL SCORE
-- ============================================

CREATE OR REPLACE FUNCTION calculate_deal_score(
    p_fipe_discount DECIMAL,
    p_year INTEGER,
    p_mileage INTEGER,
    p_auction_type TEXT,
    p_has_financing BOOLEAN
)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
    -- Pontuação baseada no desconto FIPE (0-40 pontos)
    score := score + LEAST(GREATEST(p_fipe_discount * 0.8, 0), 40)::INTEGER;
    
    -- Pontuação baseada no ano (0-20 pontos)
    IF p_year IS NOT NULL THEN
        score := score + LEAST(GREATEST((20 - (current_year - p_year)), 0), 20);
    END IF;
    
    -- Pontuação baseada na quilometragem (0-15 pontos)
    IF p_mileage IS NOT NULL THEN
        CASE
            WHEN p_mileage < 30000 THEN score := score + 15;
            WHEN p_mileage < 60000 THEN score := score + 12;
            WHEN p_mileage < 100000 THEN score := score + 8;
            WHEN p_mileage < 150000 THEN score := score + 4;
            ELSE score := score + 0;
        END CASE;
    END IF;
    
    -- Pontuação baseada no tipo de leilão (0-15 pontos)
    CASE p_auction_type
        WHEN 'Online' THEN score := score + 15;
        WHEN 'Híbrido' THEN score := score + 10;
        WHEN 'Presencial' THEN score := score + 5;
        ELSE score := score + 0;
    END CASE;
    
    -- Pontuação baseada em financiamento (0-10 pontos)
    IF p_has_financing = false THEN
        score := score + 10;
    END IF;
    
    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 13. BUSCAR MODELOS POR MARCA
-- ============================================

CREATE OR REPLACE FUNCTION get_models_by_brand(p_brand TEXT)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_agg(row_to_json(model_data) ORDER BY model)
        FROM (
            SELECT 
                model,
                COUNT(*) as count,
                MIN(current_bid) as min_price,
                MAX(current_bid) as max_price,
                AVG(deal_score)::INTEGER as avg_score
            FROM public.vehicles
            WHERE 
                is_active = true
                AND brand = p_brand
            GROUP BY model
            HAVING COUNT(*) > 0
        ) model_data
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 14. ESTATÍSTICAS DE SCRAPING
-- ============================================

CREATE OR REPLACE FUNCTION get_scraping_stats(p_days INTEGER DEFAULT 7)
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'total_executions', (
            SELECT COUNT(*)
            FROM public.scraping_logs
            WHERE started_at > NOW() - (p_days || ' days')::INTERVAL
        ),
        'success_rate', (
            SELECT ROUND(
                COUNT(CASE WHEN status = 'success' THEN 1 END)::NUMERIC / 
                NULLIF(COUNT(*), 0) * 100, 2
            )
            FROM public.scraping_logs
            WHERE started_at > NOW() - (p_days || ' days')::INTERVAL
        ),
        'total_vehicles_scraped', (
            SELECT SUM(vehicles_scraped)
            FROM public.scraping_logs
            WHERE started_at > NOW() - (p_days || ' days')::INTERVAL
        ),
        'avg_execution_time_ms', (
            SELECT AVG(execution_time_ms)::INTEGER
            FROM public.scraping_logs
            WHERE 
                started_at > NOW() - (p_days || ' days')::INTERVAL
                AND execution_time_ms IS NOT NULL
        ),
        'by_auctioneer', (
            SELECT json_agg(row_to_json(stats))
            FROM (
                SELECT 
                    a.name as auctioneer_name,
                    COUNT(sl.id) as executions,
                    SUM(sl.vehicles_scraped) as total_scraped,
                    AVG(sl.execution_time_ms)::INTEGER as avg_time_ms
                FROM public.scraping_logs sl
                INNER JOIN public.auctioneers a ON sl.auctioneer_id = a.id
                WHERE sl.started_at > NOW() - (p_days || ' days')::INTERVAL
                GROUP BY a.name
                ORDER BY total_scraped DESC
            ) stats
        )
    );
END;
$$ LANGUAGE plpgsql;

