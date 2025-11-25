-- Migration: Adicionar coluna vehicle_type_id na tabela fipe_models
-- Esta coluna permite lookup direto: Modelo → Tipo de Veículo
-- Resolve problema de marcas "duais" (Honda, Suzuki, Volvo) que fabricam carros e motos

-- Passo 1: Adicionar coluna vehicle_type_id (nullable inicialmente)
ALTER TABLE public.fipe_models
  ADD COLUMN IF NOT EXISTS vehicle_type_id UUID REFERENCES public.fipe_vehicle_types(id) ON DELETE CASCADE;

-- Passo 2: Popular a coluna com os valores corretos baseados no vehicle_type_id da marca relacionada
UPDATE public.fipe_models fm
SET vehicle_type_id = fb.vehicle_type_id
FROM public.fipe_brands fb
WHERE fm.brand_id = fb.id
  AND fm.vehicle_type_id IS NULL;

-- Passo 3: Tornar a coluna NOT NULL após popular
-- (Apenas se todos os registros foram populados)
DO $$
BEGIN
  -- Verificar se há registros sem vehicle_type_id
  IF NOT EXISTS (
    SELECT 1 FROM public.fipe_models WHERE vehicle_type_id IS NULL
  ) THEN
    -- Se não há NULLs, adicionar constraint NOT NULL
    ALTER TABLE public.fipe_models
      ALTER COLUMN vehicle_type_id SET NOT NULL;
  ELSE
    -- Se há NULLs, logar aviso
    RAISE NOTICE 'Atenção: Existem modelos sem vehicle_type_id. Execute UPDATE manualmente antes de adicionar NOT NULL.';
  END IF;
END $$;

-- Passo 4: Criar índice para performance em buscas por tipo de veículo
CREATE INDEX IF NOT EXISTS idx_fipe_models_vehicle_type_id 
  ON public.fipe_models(vehicle_type_id);

-- Passo 5: Criar índice composto para lookup direto modelo → tipo
CREATE INDEX IF NOT EXISTS idx_fipe_models_base_search_name_vehicle_type
  ON public.fipe_models(base_search_name, vehicle_type_id);

-- Comentários
COMMENT ON COLUMN public.fipe_models.vehicle_type_id IS 
  'Referência direta ao tipo de veículo (carros, motos, caminhoes). Permite lookup direto sem precisar passar pela tabela fipe_brands.';

