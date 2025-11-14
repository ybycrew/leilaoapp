-- Diagnostic simples e direto para verificar o problema
-- Execute estas queries uma por uma e me envie os resultados

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
-- 3. VER DEFINIÇÃO DA VIEW ATUAL
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
-- 5. VER ESTRUTURA DA TABELA VEHICLES
-- ============================================
-- Ver se as colunas em inglês existem
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'vehicles'
  AND column_name IN ('state', 'city', 'brand', 'model', 'vehicle_type', 'title', 'auctioneer_id', 'is_active')
ORDER BY column_name;

-- ============================================
-- 6. VER ALGUNS REGISTROS DE EXEMPLO
-- ============================================
SELECT 
    id,
    COALESCE(title, titulo) as titulo,
    COALESCE(brand, marca) as marca,
    COALESCE(model, modelo) as modelo,
    COALESCE(state, estado) as estado,
    COALESCE(city, cidade) as cidade,
    auctioneer_id,
    is_active,
    created_at
FROM public.vehicles
LIMIT 5;

-- ============================================
-- 7. VERIFICAR SE EXISTEM COLUNAS EM PORTUGUÊS
-- ============================================
SELECT 
    column_name,
    CASE 
        WHEN column_name IN ('estado', 'cidade', 'marca', 'modelo', 'titulo', 'tipo_veiculo') THEN 'PORTUGUÊS'
        WHEN column_name IN ('state', 'city', 'brand', 'model', 'title', 'vehicle_type') THEN 'INGLÊS'
        ELSE 'OUTRA'
    END as tipo_coluna
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'vehicles'
  AND column_name IN (
    'estado', 'cidade', 'marca', 'modelo', 'titulo', 'tipo_veiculo',
    'state', 'city', 'brand', 'model', 'title', 'vehicle_type'
  )
ORDER BY tipo_coluna, column_name;

