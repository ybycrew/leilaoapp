-- Diagnostic final - versão corrigida
-- Não usa colunas em português, apenas inglês

-- ============================================
-- 1. CONTAR REGISTROS NA TABELA VEHICLES
-- ============================================
SELECT 
    'Tabela vehicles' as fonte,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN is_active = true THEN 1 END) as registros_ativos,
    COUNT(CASE WHEN is_active = false OR is_active IS NULL THEN 1 END) as registros_inativos,
    COUNT(CASE WHEN auctioneer_id IS NOT NULL THEN 1 END) as com_auctioneer_id,
    COUNT(CASE WHEN auctioneer_id IS NULL THEN 1 END) as sem_auctioneer_id
FROM public.vehicles;

-- ============================================
-- 2. CONTAR REGISTROS NA VIEW
-- ============================================
SELECT 
    'View vehicles_with_auctioneer' as fonte,
    COUNT(*) as total_registros
FROM public.vehicles_with_auctioneer;

-- ============================================
-- 3. VER DEFINIÇÃO DA VIEW ATUAL (MUITO IMPORTANTE!)
-- ============================================
SELECT 
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public' 
  AND viewname = 'vehicles_with_auctioneer';

-- ============================================
-- 4. TESTAR JOIN MANUAL
-- ============================================
SELECT 
    'JOIN manual (vehicles INNER JOIN auctioneers)' as fonte,
    COUNT(*) as total_registros
FROM public.vehicles v
INNER JOIN public.auctioneers a ON v.auctioneer_id = a.id
WHERE v.is_active = true;

-- ============================================
-- 5. VER TODAS AS COLUNAS DA TABELA VEHICLES
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'vehicles'
ORDER BY ordinal_position;

-- ============================================
-- 6. VER ALGUNS REGISTROS DE EXEMPLO DA TABELA
-- ============================================
SELECT 
    id,
    title,
    brand,
    model,
    state,
    city,
    auctioneer_id,
    is_active,
    created_at
FROM public.vehicles
LIMIT 5;

-- ============================================
-- 7. VER ALGUNS REGISTROS DE EXEMPLO DA VIEW
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
    is_active,
    created_at
FROM public.vehicles_with_auctioneer
LIMIT 5;

-- ============================================
-- 8. VERIFICAR SE EXISTEM OUTRAS VIEWS OU TABELAS
-- ============================================
SELECT 
    'Views' as tipo,
    viewname as nome
FROM pg_views
WHERE schemaname = 'public' 
  AND viewname LIKE '%vehicle%'
UNION ALL
SELECT 
    'Tabelas' as tipo,
    table_name as nome
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name LIKE '%vehicle%'
  AND table_type = 'BASE TABLE';

