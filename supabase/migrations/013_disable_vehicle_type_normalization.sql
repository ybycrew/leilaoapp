-- Migration: Desabilitar normalização de vehicle_type baseada em FIPE
-- Data: 2025-01-XX
-- 
-- Esta migration desabilita a função normalize_vehicle_type que estava
-- normalizando tipos baseados em FIPE. A partir de agora, os tipos vêm
-- diretamente das URLs dos leiloeiros e não devem ser alterados.
--
-- Tipos aceitos: "Caminhões e Ônibus", "Carros", "Motos"

-- ============================================
-- 1. MODIFICAR FUNÇÃO normalize_vehicle_type
-- ============================================
-- Modificar a função para não fazer nada (apenas retornar NEW sem alterações)

CREATE OR REPLACE FUNCTION normalize_vehicle_type()
RETURNS TRIGGER AS $$
BEGIN
  -- Não fazer nenhuma normalização - retornar o tipo exatamente como veio
  -- Os tipos agora vêm diretamente das URLs dos leiloeiros:
  -- - "Caminhões e Ônibus"
  -- - "Carros"
  -- - "Motos"
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. VERIFICAR TRIGGERS QUE USAM A FUNÇÃO
-- ============================================

-- Listar triggers que podem estar usando a função
DO $$
DECLARE
  trigger_rec RECORD;
BEGIN
  FOR trigger_rec IN
    SELECT 
      trigger_name,
      event_manipulation,
      event_object_table,
      action_timing
    FROM information_schema.triggers
    WHERE event_object_table = 'vehicles'
      AND action_statement LIKE '%normalize_vehicle_type%'
  LOOP
    RAISE NOTICE 'Trigger encontrado: % em % % na tabela %', 
      trigger_rec.trigger_name,
      trigger_rec.action_timing,
      trigger_rec.event_manipulation,
      trigger_rec.event_object_table;
  END LOOP;
END $$;

-- ============================================
-- 3. COMENTÁRIOS
-- ============================================

COMMENT ON FUNCTION normalize_vehicle_type() IS 
'Função desabilitada - não normaliza mais vehicle_type baseado em FIPE.
Os tipos agora vêm diretamente das URLs dos leiloeiros e são salvos sem alteração.';

