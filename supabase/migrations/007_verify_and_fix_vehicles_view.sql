-- Migration: Verificar e corrigir view vehicles_with_auctioneer
-- Data: 2025-01-XX
-- 
-- Esta migration verifica a view atual e a recria se necessário
-- para garantir que ela use a estrutura correta

-- ============================================
-- 1. VERIFICAR A VIEW ATUAL
-- ===========================================

-- Ver a definição atual da view
DO $$
DECLARE
    current_definition TEXT;
BEGIN
    SELECT definition INTO current_definition
    FROM pg_views
    WHERE schemaname = 'public' 
      AND viewname = 'vehicles_with_auctioneer';
    
    IF current_definition IS NOT NULL THEN
        RAISE NOTICE 'Definição atual da view: %', current_definition;
    ELSE
        RAISE NOTICE 'View não encontrada, será criada';
    END IF;
END $$;

-- ============================================
-- 2. RECRIAR A VIEW COM A ESTRUTURA CORRETA
-- ===========================================

-- Recriar a view com a estrutura correta
-- Esta view deve retornar apenas os registros da tabela vehicles
-- que têm auctioneer_id válido e estão ativos

CREATE OR REPLACE VIEW public.vehicles_with_auctioneer AS
SELECT 
    v.*,
    a.name as auctioneer_name,
    a.slug as auctioneer_slug,
    a.logo_url as auctioneer_logo
FROM public.vehicles v
INNER JOIN public.auctioneers a ON v.auctioneer_id = a.id
WHERE v.is_active = true;

-- ============================================
-- 3. COMENTÁRIOS E DOCUMENTAÇÃO
-- ===========================================

COMMENT ON VIEW public.vehicles_with_auctioneer IS 
'View que retorna veículos ativos com informações do leiloeiro. 
Esta view faz INNER JOIN entre vehicles e auctioneers, então só 
retorna veículos que têm auctioneer_id válido e estão ativos.';

-- ============================================
-- 4. VERIFICAR SE A VIEW ESTÁ CORRETA
-- ===========================================

-- Testar contagem
DO $$
DECLARE
    vehicles_count BIGINT;
    view_count BIGINT;
    join_count BIGINT;
BEGIN
    -- Contar na tabela vehicles (ativos com auctioneer_id)
    SELECT COUNT(*) INTO vehicles_count
    FROM public.vehicles v
    WHERE v.is_active = true 
      AND v.auctioneer_id IS NOT NULL;
    
    -- Contar na view
    SELECT COUNT(*) INTO view_count
    FROM public.vehicles_with_auctioneer;
    
    -- Contar no join manual
    SELECT COUNT(*) INTO join_count
    FROM public.vehicles v
    INNER JOIN public.auctioneers a ON v.auctioneer_id = a.id
    WHERE v.is_active = true;
    
    RAISE NOTICE 'Registros na tabela vehicles (ativos com auctioneer_id): %', vehicles_count;
    RAISE NOTICE 'Registros na view vehicles_with_auctioneer: %', view_count;
    RAISE NOTICE 'Registros no JOIN manual: %', join_count;
    
    IF vehicles_count != view_count OR view_count != join_count THEN
        RAISE WARNING 'INCONSISTÊNCIA DETECTADA! A view pode estar usando uma fonte de dados diferente.';
    ELSE
        RAISE NOTICE 'View está correta - contagens coincidem';
    END IF;
END $$;

