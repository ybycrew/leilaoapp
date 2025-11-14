-- Migration: Garantir que vehicles_with_auctioneer está correta
-- Data: 2025-01-XX
-- 
-- Esta migration garante que a view vehicles_with_auctioneer está usando
-- a estrutura correta e retornando todos os dados disponíveis

-- ============================================
-- 1. RECRIAR A VIEW COM A ESTRUTURA CORRETA
-- ===========================================

-- Recriar a view para garantir que está correta
-- Esta view faz INNER JOIN entre vehicles e auctioneers
-- Retorna apenas veículos ativos (is_active = true) com auctioneer válido

DROP VIEW IF EXISTS public.vehicles_with_auctioneer CASCADE;

CREATE VIEW public.vehicles_with_auctioneer AS
SELECT 
    v.*,
    a.name as auctioneer_name,
    a.slug as auctioneer_slug,
    a.logo_url as auctioneer_logo
FROM public.vehicles v
INNER JOIN public.auctioneers a ON v.auctioneer_id = a.id
WHERE v.is_active = true;

-- ============================================
-- 2. COMENTÁRIOS E DOCUMENTAÇÃO
-- ===========================================

COMMENT ON VIEW public.vehicles_with_auctioneer IS 
'View que retorna veículos ativos com informações do leiloeiro.
Esta view:
- Faz INNER JOIN entre vehicles e auctioneers
- Filtra apenas veículos ativos (is_active = true)
- Adiciona informações do leiloeiro (name, slug, logo_url)

IMPORTANTE: Para todas as consultas de LEITURA, usar esta view.
Para INSERÇÃO/ATUALIZAÇÃO, usar a tabela vehicles diretamente.';

-- ============================================
-- 3. VERIFICAR SE A VIEW ESTÁ CORRETA
-- ===========================================

DO $$
DECLARE
    vehicles_count BIGINT;
    view_count BIGINT;
    join_count BIGINT;
BEGIN
    -- Contar na tabela vehicles (ativos com auctioneer_id válido)
    SELECT COUNT(*) INTO vehicles_count
    FROM public.vehicles v
    WHERE v.is_active = true 
      AND v.auctioneer_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.auctioneers a 
        WHERE a.id = v.auctioneer_id
      );
    
    -- Contar na view
    SELECT COUNT(*) INTO view_count
    FROM public.vehicles_with_auctioneer;
    
    -- Contar no join manual
    SELECT COUNT(*) INTO join_count
    FROM public.vehicles v
    INNER JOIN public.auctioneers a ON v.auctioneer_id = a.id
    WHERE v.is_active = true;
    
    RAISE NOTICE '=== RESULTADO DA VERIFICAÇÃO ===';
    RAISE NOTICE 'Registros na tabela vehicles (ativos com auctioneer válido): %', vehicles_count;
    RAISE NOTICE 'Registros na view vehicles_with_auctioneer: %', view_count;
    RAISE NOTICE 'Registros no JOIN manual: %', join_count;
    
    IF vehicles_count != view_count OR view_count != join_count THEN
        RAISE WARNING 'INCONSISTÊNCIA DETECTADA! Verifique a estrutura da view.';
    ELSE
        RAISE NOTICE '✅ View está correta - todas as contagens coincidem';
    END IF;
END $$;

-- ============================================
-- 4. VERIFICAR ESTADOS DISPONÍVEIS
-- ===========================================

-- Mostrar quantos estados únicos existem na view
SELECT 
    'Estados únicos na view' as info,
    COUNT(DISTINCT state) as total_estados,
    array_agg(DISTINCT state ORDER BY state) as estados
FROM public.vehicles_with_auctioneer
WHERE state IS NOT NULL;

