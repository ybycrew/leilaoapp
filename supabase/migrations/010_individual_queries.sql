-- Execute estas queries UMA POR UMA e me envie os resultados de cada uma
-- Cole o resultado de cada query para mim

-- ============================================
-- QUERY 1: Contar registros na tabela vehicles
-- ============================================
SELECT 
    'Tabela vehicles' as fonte,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN is_active = true THEN 1 END) as registros_ativos,
    COUNT(CASE WHEN auctioneer_id IS NOT NULL THEN 1 END) as com_auctioneer_id
FROM public.vehicles;

-- ============================================
-- QUERY 2: Contar registros na view
-- ============================================
SELECT 
    'View vehicles_with_auctioneer' as fonte,
    COUNT(*) as total_registros
FROM public.vehicles_with_auctioneer;

-- ============================================
-- QUERY 3: DEFINICÃO DA VIEW (MUITO IMPORTANTE!)
-- Execute esta e copie o resultado completo da coluna "definition"
-- ============================================
SELECT definition
FROM pg_views
WHERE schemaname = 'public' 
  AND viewname = 'vehicles_with_auctioneer';

-- ============================================
-- QUERY 4: Testar JOIN manual
-- ============================================
SELECT 
    'JOIN manual' as fonte,
    COUNT(*) as total_registros
FROM public.vehicles v
INNER JOIN public.auctioneers a ON v.auctioneer_id = a.id
WHERE v.is_active = true;

-- ============================================
-- QUERY 5: Ver alguns registros da view (primeiros 3)
-- ============================================
SELECT 
    id,
    title,
    brand,
    model,
    state,
    city,
    auctioneer_id,
    auctioneer_name,
    is_active
FROM public.vehicles_with_auctioneer
LIMIT 3;

