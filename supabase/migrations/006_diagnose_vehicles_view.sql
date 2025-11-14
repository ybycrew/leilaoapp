-- Migration: Diagnosticar view vehicles_with_auctioneer
-- Data: 2025-01-XX
-- 
-- Diagnóstico para entender por que a view tem mais registros que a tabela

-- ============================================
-- 1. VERIFICAR ESTRUTURA DA TABELA VEHICLES
-- ===========================================

-- Contar registros na tabela vehicles
SELECT 
    'vehicles' as tabela,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN is_active = true THEN 1 END) as registros_ativos,
    COUNT(CASE WHEN auctioneer_id IS NOT NULL THEN 1 END) as com_auctioneer_id
FROM public.vehicles;

-- Ver estrutura das colunas
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'vehicles'
ORDER BY ordinal_position;

-- ============================================
-- 2. VERIFICAR TABELA AUCTIONEERS
-- ===========================================

-- Contar leiloeiros
SELECT 
    'auctioneers' as tabela,
    COUNT(*) as total_leiloeiros,
    COUNT(CASE WHEN is_active = true THEN 1 END) as leiloeiros_ativos
FROM public.auctioneers;

-- ============================================
-- 3. VERIFICAR A VIEW ATUAL
-- ===========================================

-- Ver a definição atual da view
SELECT 
    definition
FROM pg_views
WHERE schemaname = 'public' 
  AND viewname = 'vehicles_with_auctioneer';

-- Contar registros na view
SELECT 
    'vehicles_with_auctioneer (view)' as fonte,
    COUNT(*) as total_registros
FROM public.vehicles_with_auctioneer;

-- ============================================
-- 4. TESTAR O JOIN MANUAL
-- ===========================================

-- Testar o join que deveria ser feito pela view
SELECT 
    'JOIN manual' as teste,
    COUNT(*) as total_registros
FROM public.vehicles v
INNER JOIN public.auctioneers a ON v.auctioneer_id = a.id
WHERE v.is_active = true;

-- ============================================
-- 5. VERIFICAR SE HÁ OUTRA TABELA/VIEW
-- ===========================================

-- Ver todas as views que contêm 'vehicle' no nome
SELECT 
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public' 
  AND viewname LIKE '%vehicle%';

-- Ver todas as tabelas que contêm 'vehicle' no nome
SELECT 
    table_name
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name LIKE '%vehicle%'
  AND table_type = 'BASE TABLE';

-- ============================================
-- 6. VERIFICAR SCHEMA DA TABELA VEHICLES
-- ===========================================

-- Ver alguns registros de exemplo da tabela vehicles
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
LIMIT 10;

-- ============================================
-- 7. VERIFICAR SE HÁ DADOS EM OUTRO SCHEMA
-- ===========================================

-- Ver schemas disponíveis
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY schema_name;

