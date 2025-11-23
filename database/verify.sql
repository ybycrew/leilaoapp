-- ============================================
-- VERIFICAÇÃO DE INTEGRIDADE - YBYBID
-- Script para verificar se o banco foi instalado corretamente
-- ============================================

-- Execute este arquivo após instalar schema.sql e queries.sql
-- Resultado esperado: todas as verificações devem retornar "✓ OK"

\echo '============================================'
\echo 'VERIFICAÇÃO DE INTEGRIDADE DO BANCO DE DADOS'
\echo '============================================'
\echo ''

-- ============================================
-- 1. VERIFICAR EXTENSÕES
-- ============================================

\echo '1. Verificando extensões PostgreSQL...'

SELECT 
    CASE 
        WHEN COUNT(*) >= 2 THEN '✓ OK - Extensões instaladas'
        ELSE '✗ ERRO - Faltam extensões'
    END as status,
    array_agg(extname) as extensoes_instaladas
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'unaccent');

\echo ''

-- ============================================
-- 2. VERIFICAR TABELAS
-- ============================================

\echo '2. Verificando tabelas criadas...'

WITH expected_tables AS (
    SELECT unnest(ARRAY[
        'profiles', 'plans', 'subscriptions', 'auctioneers', 'vehicles',
        'vehicle_images', 'favorites', 'search_history', 'saved_filters',
        'alerts', 'fipe_prices', 'scraping_logs'
    ]) as table_name
),
existing_tables AS (
    SELECT tablename as table_name
    FROM pg_tables
    WHERE schemaname = 'public'
)
SELECT 
    CASE 
        WHEN COUNT(DISTINCT et.table_name) = COUNT(DISTINCT ext.table_name) 
        THEN '✓ OK - Todas as ' || COUNT(DISTINCT et.table_name) || ' tabelas criadas'
        ELSE '✗ ERRO - Faltam ' || (COUNT(DISTINCT et.table_name) - COUNT(DISTINCT ext.table_name)) || ' tabelas'
    END as status
FROM expected_tables et
LEFT JOIN existing_tables ext ON et.table_name = ext.table_name;

-- Listar tabelas criadas
SELECT 
    tablename as tabela,
    pg_size_pretty(pg_total_relation_size('public.' || tablename)) as tamanho
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

\echo ''

-- ============================================
-- 3. VERIFICAR FUNÇÕES
-- ============================================

\echo '3. Verificando funções criadas...'

WITH expected_functions AS (
    SELECT unnest(ARRAY[
        'search_vehicles', 'get_vehicle_details', 'can_user_search',
        'increment_search_count', 'get_user_favorites', 'get_search_history',
        'get_dashboard_stats', 'get_available_filters', 'check_alerts_for_new_vehicles',
        'cleanup_old_vehicles', 'update_vehicle_fipe_price', 'calculate_deal_score',
        'get_models_by_brand', 'get_scraping_stats', 'update_updated_at_column',
        'update_vehicle_favorites_count', 'handle_new_user'
    ]) as function_name
),
existing_functions AS (
    SELECT routine_name as function_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
)
SELECT 
    CASE 
        WHEN COUNT(DISTINCT ef.function_name) = COUNT(DISTINCT exf.function_name) 
        THEN '✓ OK - Todas as ' || COUNT(DISTINCT ef.function_name) || ' funções criadas'
        ELSE '✗ ERRO - Faltam ' || (COUNT(DISTINCT ef.function_name) - COUNT(DISTINCT exf.function_name)) || ' funções'
    END as status
FROM expected_functions ef
LEFT JOIN existing_functions exf ON ef.function_name = exf.function_name;

-- Listar funções criadas
SELECT 
    routine_name as funcao,
    routine_type as tipo
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

\echo ''

-- ============================================
-- 4. VERIFICAR TRIGGERS
-- ============================================

\echo '4. Verificando triggers...'

SELECT 
    CASE 
        WHEN COUNT(*) >= 7 THEN '✓ OK - ' || COUNT(*) || ' triggers criados'
        ELSE '✗ ERRO - Faltam triggers'
    END as status
FROM pg_trigger
WHERE tgname LIKE 'update_%_updated_at' 
   OR tgname = 'update_favorites_count'
   OR tgname = 'on_auth_user_created';

-- Listar triggers
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as tabela,
    CASE 
        WHEN tgenabled = 'O' THEN 'Habilitado'
        ELSE 'Desabilitado'
    END as status
FROM pg_trigger
WHERE tgisinternal = false
ORDER BY tgname;

\echo ''

-- ============================================
-- 5. VERIFICAR ÍNDICES
-- ============================================

\echo '5. Verificando índices...'

SELECT 
    CASE 
        WHEN COUNT(*) >= 30 THEN '✓ OK - ' || COUNT(*) || ' índices criados'
        ELSE '⚠ AVISO - Poucos índices (' || COUNT(*) || ')'
    END as status
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname NOT LIKE '%_pkey';

-- Listar alguns índices importantes
SELECT 
    tablename as tabela,
    indexname as indice,
    indexdef as definicao
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname
LIMIT 20;

\echo ''

-- ============================================
-- 6. VERIFICAR ROW LEVEL SECURITY
-- ============================================

\echo '6. Verificando Row Level Security (RLS)...'

WITH tables_with_rls AS (
    SELECT 
        relname as table_name,
        relrowsecurity as rls_enabled
    FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
    AND relkind = 'r'
    AND relname IN ('profiles', 'subscriptions', 'favorites', 'search_history', 
                    'saved_filters', 'alerts', 'vehicles', 'auctioneers', 
                    'plans', 'fipe_prices')
)
SELECT 
    CASE 
        WHEN COUNT(*) = COUNT(*) FILTER (WHERE rls_enabled) 
        THEN '✓ OK - RLS habilitado em todas as tabelas sensíveis'
        ELSE '✗ ERRO - RLS faltando em ' || (COUNT(*) - COUNT(*) FILTER (WHERE rls_enabled)) || ' tabelas'
    END as status
FROM tables_with_rls;

-- Contar políticas RLS
SELECT 
    CASE 
        WHEN COUNT(*) >= 10 THEN '✓ OK - ' || COUNT(*) || ' políticas RLS criadas'
        ELSE '✗ ERRO - Poucas políticas RLS'
    END as status
FROM pg_policies
WHERE schemaname = 'public';

-- Listar políticas RLS
SELECT 
    schemaname,
    tablename as tabela,
    policyname as politica,
    cmd as comando,
    CASE 
        WHEN roles = '{public}' THEN 'Público'
        ELSE array_to_string(roles, ', ')
    END as roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

\echo ''

-- ============================================
-- 7. VERIFICAR VIEWS
-- ============================================

\echo '7. Verificando views...'

SELECT 
    CASE 
        WHEN COUNT(*) >= 2 THEN '✓ OK - ' || COUNT(*) || ' views criadas'
        ELSE '✗ ERRO - Faltam views'
    END as status
FROM pg_views
WHERE schemaname = 'public'
AND viewname IN ('vehicles_with_auctioneer', 'users_with_subscription');

-- Listar views
SELECT 
    viewname as view,
    definition as definicao
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

\echo ''

-- ============================================
-- 8. VERIFICAR CONSTRAINTS
-- ============================================

\echo '8. Verificando constraints...'

SELECT 
    CASE 
        WHEN COUNT(*) >= 15 THEN '✓ OK - ' || COUNT(*) || ' constraints criadas'
        ELSE '⚠ AVISO - Poucas constraints'
    END as status
FROM information_schema.table_constraints
WHERE constraint_schema = 'public'
AND constraint_type IN ('FOREIGN KEY', 'UNIQUE', 'CHECK');

-- Listar foreign keys
SELECT 
    tc.table_name as tabela,
    tc.constraint_name as constraint,
    kcu.column_name as coluna,
    ccu.table_name as tabela_referenciada
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_schema = 'public'
AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name
LIMIT 20;

\echo ''

-- ============================================
-- 9. VERIFICAR DADOS INICIAIS (PLANOS)
-- ============================================

\echo '9. Verificando dados iniciais...'

SELECT 
    CASE 
        WHEN COUNT(*) >= 3 THEN '✓ OK - ' || COUNT(*) || ' planos cadastrados'
        ELSE '✗ ERRO - Faltam planos'
    END as status
FROM plans;

-- Listar planos
SELECT 
    name as plano,
    price as preco,
    interval as intervalo,
    search_limit as limite_buscas,
    is_active as ativo
FROM plans
ORDER BY price;

\echo ''

-- ============================================
-- 10. TESTE RÁPIDO DE FUNÇÕES
-- ============================================

\echo '10. Testando funções principais...'

-- Testar calculate_deal_score
SELECT 
    CASE 
        WHEN calculate_deal_score(30, 2022, 45000, 'Online', false) BETWEEN 0 AND 100
        THEN '✓ OK - calculate_deal_score funcionando'
        ELSE '✗ ERRO - calculate_deal_score com problema'
    END as status;

-- Testar get_available_filters
SELECT 
    CASE 
        WHEN get_available_filters() IS NOT NULL
        THEN '✓ OK - get_available_filters funcionando'
        ELSE '✗ ERRO - get_available_filters com problema'
    END as status;

-- Testar get_dashboard_stats
SELECT 
    CASE 
        WHEN get_dashboard_stats() IS NOT NULL
        THEN '✓ OK - get_dashboard_stats funcionando'
        ELSE '✗ ERRO - get_dashboard_stats com problema'
    END as status;

\echo ''

-- ============================================
-- 11. RESUMO FINAL
-- ============================================

\echo '============================================'
\echo 'RESUMO DA VERIFICAÇÃO'
\echo '============================================'

WITH verification_summary AS (
    SELECT 
        'Tabelas' as categoria,
        (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public')::text as quantidade,
        '12+' as esperado
    UNION ALL
    SELECT 
        'Funções',
        (SELECT COUNT(*)::text FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'),
        '17+'
    UNION ALL
    SELECT 
        'Triggers',
        (SELECT COUNT(*)::text FROM pg_trigger WHERE tgisinternal = false),
        '7+'
    UNION ALL
    SELECT 
        'Índices',
        (SELECT COUNT(*)::text FROM pg_indexes WHERE schemaname = 'public'),
        '30+'
    UNION ALL
    SELECT 
        'Políticas RLS',
        (SELECT COUNT(*)::text FROM pg_policies WHERE schemaname = 'public'),
        '10+'
    UNION ALL
    SELECT 
        'Views',
        (SELECT COUNT(*)::text FROM pg_views WHERE schemaname = 'public'),
        '2+'
    UNION ALL
    SELECT 
        'Planos',
        (SELECT COUNT(*)::text FROM plans),
        '3'
)
SELECT 
    categoria,
    quantidade as "Quantidade Criada",
    esperado as "Esperado"
FROM verification_summary;

\echo ''
\echo '✓ Verificação concluída!'
\echo ''
\echo 'Se todos os itens acima mostraram "✓ OK", seu banco está configurado corretamente!'
\echo 'Se houver "✗ ERRO", revise a instalação dos arquivos SQL.'
\echo ''
\echo 'Próximos passos:'
\echo '1. Se em desenvolvimento, execute: \\i database/seeds.sql'
\echo '2. Configure Supabase Auth no frontend'
\echo '3. Implemente as APIs usando as funções criadas'
\echo ''
\echo '============================================'

-- ============================================
-- INFORMAÇÕES ADICIONAIS
-- ============================================

\echo 'Tamanho total do banco:'
SELECT pg_size_pretty(pg_database_size(current_database())) as tamanho_banco;

\echo ''
\echo 'Top 5 maiores tabelas:'
SELECT 
    schemaname || '.' || tablename as tabela,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanho
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 5;

