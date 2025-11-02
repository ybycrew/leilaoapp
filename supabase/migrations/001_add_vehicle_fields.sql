-- Migration: Adicionar campos para melhor gestão de veículos
-- Data: 2025-11-02

-- Passo 1: Adicionar external_id para identificar veículos únicos de cada leiloeiro
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Passo 2: Verificar estrutura da tabela e criar índices condicionalmente
-- Primeiro, vamos verificar se a coluna leiloeiro existe
DO $$
BEGIN
  -- Adicionar índice para busca rápida por external_id
  CREATE INDEX IF NOT EXISTS idx_vehicles_external_id_simple 
  ON vehicles(external_id) 
  WHERE external_id IS NOT NULL;
  
  -- Adicionar índice para melhorar busca por modelo (se existir)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'modelo'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_vehicles_modelo ON vehicles(modelo);
  END IF;
  
  -- Tentar criar índice único usando leiloeiro se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'leiloeiro'
  ) THEN
    -- Remover índice anterior se existir com nome diferente
    DROP INDEX IF EXISTS idx_vehicles_external_id;
    
    -- Criar índice composto leiloeiro + external_id
    CREATE INDEX IF NOT EXISTS idx_vehicles_leiloeiro_external_id 
    ON vehicles(leiloeiro, external_id) 
    WHERE external_id IS NOT NULL;
    
    -- Criar índice único composto para evitar duplicatas
    CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_unique_external 
    ON vehicles(leiloeiro, external_id) 
    WHERE external_id IS NOT NULL;
  ELSE
    -- Se leiloeiro não existir, criar índice único apenas com external_id
    -- (menos ideal, mas funcional)
    CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_unique_external_id 
    ON vehicles(external_id) 
    WHERE external_id IS NOT NULL;
  END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN vehicles.external_id IS 'ID externo do veículo no sistema do leiloeiro, usado para evitar duplicatas';

