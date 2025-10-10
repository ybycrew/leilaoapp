-- ============================================
-- EXEMPLOS DE USO - LEILAOMAX
-- Queries de exemplo para cada funcionalidade
-- ============================================

-- ============================================
-- 1. EXEMPLOS DE BUSCA DE VEÍCULOS
-- ============================================

-- Exemplo 1: Busca simples por texto
SELECT * FROM search_vehicles(
    p_search_text := 'honda civic'
);

-- Exemplo 2: Busca com filtros básicos
SELECT * FROM search_vehicles(
    p_brands := ARRAY['Honda', 'Toyota'],
    p_min_year := 2020,
    p_max_price := 100000,
    p_order_by := 'price_asc',
    p_limit := 10
);

-- Exemplo 3: Busca regional com múltiplos filtros
SELECT * FROM search_vehicles(
    p_states := ARRAY['SP', 'RJ', 'MG'],
    p_vehicle_types := ARRAY['Carro', 'SUV'],
    p_min_deal_score := 75,
    p_fuel_types := ARRAY['Flex', 'Gasolina'],
    p_transmissions := ARRAY['Automático'],
    p_order_by := 'deal_score',
    p_limit := 20
);

-- Exemplo 4: Busca avançada com data de leilão
SELECT * FROM search_vehicles(
    p_brands := ARRAY['Chevrolet', 'Volkswagen'],
    p_min_year := 2021,
    p_max_mileage := 50000,
    p_has_financing := false,
    p_auction_date_from := CURRENT_DATE,
    p_auction_date_to := CURRENT_DATE + INTERVAL '30 days',
    p_order_by := 'date_asc'
);

-- Exemplo 5: Busca com paginação
SELECT * FROM search_vehicles(
    p_vehicle_types := ARRAY['Caminhonete'],
    p_limit := 20,
    p_offset := 0  -- Página 1
);

-- Próxima página
SELECT * FROM search_vehicles(
    p_vehicle_types := ARRAY['Caminhonete'],
    p_limit := 20,
    p_offset := 20  -- Página 2
);


-- ============================================
-- 2. DETALHES DE VEÍCULOS
-- ============================================

-- Obter detalhes completos de um veículo (com imagens e similares)
SELECT get_vehicle_details('id-do-veiculo-uuid');

-- Buscar veículo específico
SELECT 
    v.*,
    a.name as auctioneer_name,
    a.website_url
FROM vehicles v
INNER JOIN auctioneers a ON v.auctioneer_id = a.id
WHERE v.id = 'id-do-veiculo-uuid';

-- Listar todas as imagens de um veículo
SELECT * 
FROM vehicle_images 
WHERE vehicle_id = 'id-do-veiculo-uuid'
ORDER BY is_primary DESC, display_order ASC;


-- ============================================
-- 3. GESTÃO DE USUÁRIO
-- ============================================

-- Verificar se usuário pode fazer busca
SELECT can_user_search('id-do-usuario-uuid');

-- Resultado exemplo:
-- {
--   "can_search": true,
--   "searches_used": 3,
--   "search_limit": 5,
--   "plan_name": "Gratuito",
--   "subscription_status": "none"
-- }

-- Incrementar contador de buscas
SELECT increment_search_count('id-do-usuario-uuid');

-- Ver perfil completo do usuário com informações de assinatura
SELECT * FROM users_with_subscription
WHERE id = 'id-do-usuario-uuid';

-- Atualizar perfil do usuário
UPDATE profiles
SET 
    full_name = 'João Silva',
    phone = '(11) 98765-4321'
WHERE id = 'id-do-usuario-uuid';


-- ============================================
-- 4. FAVORITOS
-- ============================================

-- Obter favoritos do usuário
SELECT get_user_favorites('id-do-usuario-uuid');

-- Adicionar veículo aos favoritos
INSERT INTO favorites (user_id, vehicle_id, notes)
VALUES (
    'id-do-usuario-uuid',
    'id-do-veiculo-uuid',
    'Interessado, verificar documentação'
);

-- Remover dos favoritos
DELETE FROM favorites
WHERE user_id = 'id-do-usuario-uuid'
AND vehicle_id = 'id-do-veiculo-uuid';

-- Verificar se veículo está nos favoritos
SELECT EXISTS(
    SELECT 1 FROM favorites
    WHERE user_id = 'id-do-usuario-uuid'
    AND vehicle_id = 'id-do-veiculo-uuid'
) as is_favorite;

-- Contar favoritos do usuário
SELECT COUNT(*) 
FROM favorites
WHERE user_id = 'id-do-usuario-uuid';


-- ============================================
-- 5. HISTÓRICO DE BUSCAS
-- ============================================

-- Obter histórico de buscas
SELECT get_search_history('id-do-usuario-uuid');

-- Salvar uma busca no histórico
INSERT INTO search_history (user_id, filters, results_count)
VALUES (
    'id-do-usuario-uuid',
    '{"brand": "Honda", "min_year": 2020, "state": "SP"}'::jsonb,
    42
);

-- Buscar última busca do usuário
SELECT * FROM search_history
WHERE user_id = 'id-do-usuario-uuid'
ORDER BY created_at DESC
LIMIT 1;


-- ============================================
-- 6. FILTROS SALVOS E ALERTAS
-- ============================================

-- Criar filtro salvo
INSERT INTO saved_filters (user_id, name, filters, alert_enabled)
VALUES (
    'id-do-usuario-uuid',
    'Honda Civic SP',
    '{"brand": "Honda", "model": "Civic", "state": "SP", "min_year": 2020}'::jsonb,
    true
);

-- Listar filtros salvos do usuário
SELECT * FROM saved_filters
WHERE user_id = 'id-do-usuario-uuid'
ORDER BY created_at DESC;

-- Atualizar filtro salvo
UPDATE saved_filters
SET 
    filters = '{"brand": "Honda", "model": "Civic", "state": ["SP", "RJ"], "min_year": 2020}'::jsonb,
    alert_enabled = true
WHERE id = 'id-do-filtro-uuid'
AND user_id = 'id-do-usuario-uuid';

-- Deletar filtro salvo
DELETE FROM saved_filters
WHERE id = 'id-do-filtro-uuid'
AND user_id = 'id-do-usuario-uuid';

-- Verificar alertas pendentes do usuário
SELECT 
    a.*,
    v.title,
    v.brand,
    v.model,
    v.current_bid,
    v.deal_score
FROM alerts a
INNER JOIN vehicles v ON a.vehicle_id = v.id
WHERE a.user_id = 'id-do-usuario-uuid'
AND a.sent_at IS NULL
ORDER BY a.created_at DESC;


-- ============================================
-- 7. ASSINATURAS E PLANOS
-- ============================================

-- Listar todos os planos disponíveis
SELECT * FROM plans
WHERE is_active = true
ORDER BY price ASC;

-- Criar nova assinatura
INSERT INTO subscriptions (
    user_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    stripe_subscription_id,
    stripe_customer_id
) VALUES (
    'id-do-usuario-uuid',
    (SELECT id FROM plans WHERE name = 'Mensal'),
    'active',
    NOW(),
    NOW() + INTERVAL '1 month',
    'sub_stripe_id_123',
    'cus_stripe_id_456'
);

-- Verificar assinatura ativa do usuário
SELECT 
    s.*,
    p.name as plan_name,
    p.price,
    p.search_limit
FROM subscriptions s
INNER JOIN plans p ON s.plan_id = p.id
WHERE s.user_id = 'id-do-usuario-uuid'
AND s.status = 'active';

-- Cancelar assinatura (no fim do período)
UPDATE subscriptions
SET cancel_at_period_end = true
WHERE user_id = 'id-do-usuario-uuid'
AND status = 'active';

-- Expirar assinaturas vencidas
UPDATE subscriptions
SET status = 'expired'
WHERE status = 'active'
AND current_period_end < NOW();


-- ============================================
-- 8. LEILOEIROS E SCRAPING
-- ============================================

-- Listar todos os leiloeiros ativos
SELECT * FROM auctioneers
WHERE is_active = true
ORDER BY name;

-- Atualizar última execução de scraping
UPDATE auctioneers
SET last_scrape_at = NOW()
WHERE slug = 'sodre-santoro';

-- Leiloeiros que precisam de scraping
SELECT * FROM auctioneers
WHERE is_active = true
AND (
    last_scrape_at IS NULL 
    OR last_scrape_at < NOW() - (scrape_frequency_hours || ' hours')::INTERVAL
)
ORDER BY last_scrape_at ASC NULLS FIRST;

-- Registrar log de scraping
INSERT INTO scraping_logs (
    auctioneer_id,
    status,
    vehicles_scraped,
    vehicles_created,
    vehicles_updated,
    execution_time_ms,
    started_at,
    completed_at,
    metadata
) VALUES (
    (SELECT id FROM auctioneers WHERE slug = 'superbid'),
    'success',
    145,
    42,
    103,
    38500,
    NOW() - INTERVAL '1 hour',
    NOW(),
    '{"new_brands": ["Tesla"], "errors": []}'::jsonb
);

-- Estatísticas de scraping
SELECT get_scraping_stats(7); -- Últimos 7 dias

-- Logs de scraping recentes
SELECT 
    sl.*,
    a.name as auctioneer_name
FROM scraping_logs sl
INNER JOIN auctioneers a ON sl.auctioneer_id = a.id
ORDER BY sl.started_at DESC
LIMIT 20;


-- ============================================
-- 9. PREÇOS FIPE
-- ============================================

-- Buscar preço FIPE
SELECT * FROM fipe_prices
WHERE brand = 'Honda'
AND model = 'Civic'
AND year = 2020;

-- Atualizar preço FIPE de um veículo
SELECT update_vehicle_fipe_price(
    'id-do-veiculo-uuid',
    95000.00,  -- preço FIPE
    '002027-0' -- código FIPE
);

-- Cache de preços desatualizados (> 30 dias)
SELECT * FROM fipe_prices
WHERE fetched_at < NOW() - INTERVAL '30 days'
ORDER BY fetched_at ASC;


-- ============================================
-- 10. ESTATÍSTICAS E DASHBOARD
-- ============================================

-- Dashboard geral
SELECT get_dashboard_stats();

-- Estatísticas de veículos
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN deal_score >= 80 THEN 1 END) as excellent_deals,
    COUNT(CASE WHEN deal_score >= 60 AND deal_score < 80 THEN 1 END) as good_deals,
    AVG(current_bid) as avg_price,
    AVG(deal_score) as avg_score
FROM vehicles
WHERE is_active = true;

-- Veículos por estado
SELECT 
    state,
    COUNT(*) as count,
    AVG(current_bid) as avg_price,
    AVG(deal_score) as avg_score
FROM vehicles
WHERE is_active = true
GROUP BY state
ORDER BY count DESC;

-- Top 10 marcas mais populares
SELECT 
    brand,
    COUNT(*) as count,
    AVG(current_bid) as avg_price
FROM vehicles
WHERE is_active = true
GROUP BY brand
ORDER BY count DESC
LIMIT 10;

-- Melhores negócios do dia
SELECT 
    v.*,
    a.name as auctioneer_name
FROM vehicles v
INNER JOIN auctioneers a ON v.auctioneer_id = a.id
WHERE 
    v.is_active = true
    AND v.deal_score >= 85
ORDER BY v.deal_score DESC
LIMIT 10;

-- Veículos com leilão hoje
SELECT 
    v.*,
    a.name as auctioneer_name
FROM vehicles v
INNER JOIN auctioneers a ON v.auctioneer_id = a.id
WHERE 
    v.is_active = true
    AND DATE(v.auction_date) = CURRENT_DATE
ORDER BY v.auction_date ASC;


-- ============================================
-- 11. FILTROS DISPONÍVEIS
-- ============================================

-- Obter todos os filtros disponíveis
SELECT get_available_filters();

-- Modelos por marca
SELECT get_models_by_brand('Honda');

-- Cidades por estado
SELECT DISTINCT city
FROM vehicles
WHERE state = 'SP' AND is_active = true
ORDER BY city;

-- Range de anos disponíveis
SELECT 
    MIN(year_model) as min_year,
    MAX(year_model) as max_year
FROM vehicles
WHERE is_active = true;


-- ============================================
-- 12. CÁLCULO DE DEAL SCORE
-- ============================================

-- Calcular score para um veículo específico
SELECT calculate_deal_score(
    30.0,  -- fipe_discount_percentage
    2022,  -- year
    45000, -- mileage
    'Online', -- auction_type
    false  -- has_financing
);

-- Recalcular score de todos os veículos
UPDATE vehicles
SET deal_score = calculate_deal_score(
    fipe_discount_percentage,
    year_model,
    mileage,
    auction_type,
    has_financing
)
WHERE is_active = true;

-- Veículos com score acima de 85
SELECT 
    title,
    brand,
    model,
    current_bid,
    fipe_price,
    deal_score
FROM vehicles
WHERE deal_score >= 85
ORDER BY deal_score DESC;


-- ============================================
-- 13. ANÁLISES E RELATÓRIOS
-- ============================================

-- Veículos mais visualizados
SELECT 
    v.*,
    a.name as auctioneer_name
FROM vehicles v
INNER JOIN auctioneers a ON v.auctioneer_id = a.id
WHERE v.is_active = true
ORDER BY v.views_count DESC
LIMIT 20;

-- Veículos mais favoritados
SELECT 
    v.*,
    a.name as auctioneer_name
FROM vehicles v
INNER JOIN auctioneers a ON v.auctioneer_id = a.id
WHERE v.is_active = true
ORDER BY v.favorites_count DESC
LIMIT 20;

-- Taxa de conversão de buscas para favoritos
SELECT 
    COUNT(DISTINCT sh.user_id) as users_searched,
    COUNT(DISTINCT f.user_id) as users_favorited,
    ROUND(
        COUNT(DISTINCT f.user_id)::NUMERIC / 
        NULLIF(COUNT(DISTINCT sh.user_id), 0) * 100, 
        2
    ) as conversion_rate
FROM search_history sh
LEFT JOIN favorites f ON sh.user_id = f.user_id
WHERE sh.created_at > NOW() - INTERVAL '30 days';

-- Retenção de usuários (buscas no último mês)
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(DISTINCT user_id) as active_users
FROM search_history
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;


-- ============================================
-- 14. MANUTENÇÃO
-- ============================================

-- Limpar veículos antigos
SELECT cleanup_old_vehicles();

-- Verificar veículos duplicados
SELECT 
    auctioneer_id,
    external_id,
    COUNT(*) as count
FROM vehicles
GROUP BY auctioneer_id, external_id
HAVING COUNT(*) > 1;

-- Veículos sem imagens
SELECT v.id, v.title
FROM vehicles v
LEFT JOIN vehicle_images vi ON v.id = vi.vehicle_id
WHERE v.is_active = true
AND vi.id IS NULL;

-- Atualizar contador de favoritos (caso esteja dessincroni zado)
UPDATE vehicles v
SET favorites_count = (
    SELECT COUNT(*) 
    FROM favorites f 
    WHERE f.vehicle_id = v.id
)
WHERE v.is_active = true;


-- ============================================
-- 15. TESTES E VALIDAÇÕES
-- ============================================

-- Verificar integridade referencial
SELECT 
    'favorites' as table_name,
    COUNT(*) as orphaned_records
FROM favorites f
WHERE NOT EXISTS (SELECT 1 FROM vehicles v WHERE v.id = f.vehicle_id)
UNION ALL
SELECT 
    'vehicle_images',
    COUNT(*)
FROM vehicle_images vi
WHERE NOT EXISTS (SELECT 1 FROM vehicles v WHERE v.id = vi.vehicle_id);

-- Veículos com dados inconsistentes
SELECT * FROM vehicles
WHERE is_active = true
AND (
    current_bid IS NULL
    OR current_bid <= 0
    OR year_model < 1900
    OR year_model > EXTRACT(YEAR FROM CURRENT_DATE) + 1
);

-- Assinaturas que deveriam estar expiradas
SELECT * FROM subscriptions
WHERE status = 'active'
AND current_period_end < NOW();

