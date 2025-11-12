-- Migration: Normalizar dados de veículos (tipo, combustível, câmbio)
-- Data: 2025-01-XX
-- 
-- Normaliza valores inconsistentes nas colunas:
-- - vehicle_type / tipo_veiculo
-- - fuel_type / combustivel  
-- - transmission / cambio

-- ============================================
-- 1. NORMALIZAR TIPO DE VEÍCULO
-- ============================================

-- Normalizar vehicle_type (coluna em inglês)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'vehicle_type'
  ) THEN
    UPDATE public.vehicles
    SET vehicle_type = CASE
      WHEN LOWER(vehicle_type) IN ('car', 'carro', 'automovel', 'automóvel') THEN 'Carro'
      WHEN LOWER(vehicle_type) IN ('moto', 'motorcycle', 'motocicleta') THEN 'Moto'
      WHEN LOWER(vehicle_type) IN ('caminhao', 'caminhão', 'truck', 'caminhonete') THEN 'Caminhão'
      WHEN LOWER(vehicle_type) IN ('van', 'furgão', 'furgao') THEN 'Van'
      WHEN LOWER(vehicle_type) IN ('ônibus', 'onibus', 'bus') THEN 'Ônibus'
      WHEN vehicle_type IS NULL THEN NULL
      ELSE 'Carro' -- Default
    END
    WHERE vehicle_type IS NOT NULL;
  END IF;
END $$;

-- Normalizar tipo_veiculo (coluna em português)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'tipo_veiculo'
  ) THEN
    UPDATE public.vehicles
    SET tipo_veiculo = CASE
      WHEN LOWER(tipo_veiculo) IN ('car', 'carro', 'automovel', 'automóvel') THEN 'carro'
      WHEN LOWER(tipo_veiculo) IN ('moto', 'motorcycle', 'motocicleta') THEN 'moto'
      WHEN LOWER(tipo_veiculo) IN ('caminhao', 'caminhão', 'truck', 'caminhonete') THEN 'caminhao'
      WHEN LOWER(tipo_veiculo) IN ('van', 'furgão', 'furgao') THEN 'van'
      WHEN LOWER(tipo_veiculo) IN ('ônibus', 'onibus', 'bus') THEN 'outros'
      WHEN tipo_veiculo IS NULL THEN NULL
      ELSE 'carro' -- Default
    END
    WHERE tipo_veiculo IS NOT NULL;
  END IF;
END $$;

-- ============================================
-- 2. NORMALIZAR COMBUSTÍVEL
-- ============================================

-- Normalizar fuel_type (coluna em inglês)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'fuel_type'
  ) THEN
    UPDATE public.vehicles
    SET fuel_type = CASE
      WHEN LOWER(fuel_type) IN ('flex', 'flexalcoolgasolina', 'flex/alcool/gasolina') THEN 'Flex'
      WHEN LOWER(fuel_type) IN ('gasolina', 'gasoline') THEN 'Gasolina'
      WHEN LOWER(fuel_type) IN ('diesel') THEN 'Diesel'
      WHEN LOWER(fuel_type) IN ('etanol', 'ethanol', 'alcool', 'álcool') THEN 'Etanol'
      WHEN LOWER(fuel_type) IN ('eletrico', 'elétrico', 'electric') THEN 'Elétrico'
      WHEN LOWER(fuel_type) IN ('hibrido', 'híbrido', 'hybrid') THEN 'Híbrido'
      WHEN fuel_type IS NULL THEN NULL
      ELSE INITCAP(LOWER(TRIM(fuel_type))) -- Capitalizar primeira letra
    END
    WHERE fuel_type IS NOT NULL;
  END IF;
END $$;

-- Normalizar combustivel (coluna em português)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'combustivel'
  ) THEN
    UPDATE public.vehicles
    SET combustivel = CASE
      WHEN LOWER(combustivel) IN ('flex', 'flexalcoolgasolina', 'flex/alcool/gasolina') THEN 'Flex'
      WHEN LOWER(combustivel) IN ('gasolina', 'gasoline') THEN 'Gasolina'
      WHEN LOWER(combustivel) IN ('diesel') THEN 'Diesel'
      WHEN LOWER(combustivel) IN ('etanol', 'ethanol', 'alcool', 'álcool') THEN 'Etanol'
      WHEN LOWER(combustivel) IN ('eletrico', 'elétrico', 'electric') THEN 'Elétrico'
      WHEN LOWER(combustivel) IN ('hibrido', 'híbrido', 'hybrid') THEN 'Híbrido'
      WHEN combustivel IS NULL THEN NULL
      ELSE INITCAP(LOWER(TRIM(combustivel))) -- Capitalizar primeira letra
    END
    WHERE combustivel IS NOT NULL;
  END IF;
END $$;

-- ============================================
-- 3. NORMALIZAR CÂMBIO
-- ============================================

-- Normalizar transmission (coluna em inglês)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'transmission'
  ) THEN
    UPDATE public.vehicles
    SET transmission = CASE
      WHEN LOWER(transmission) IN ('automatico', 'automático', 'automatic', 'at', 'a/t') THEN 'Automático'
      WHEN LOWER(transmission) IN ('manual', 'mt', 'm/t') THEN 'Manual'
      WHEN LOWER(transmission) IN ('cvt') THEN 'CVT'
      WHEN LOWER(transmission) IN ('falta', 'não informado', 'nao informado', 'n/a', 'na') THEN NULL
      WHEN transmission IS NULL THEN NULL
      ELSE INITCAP(LOWER(TRIM(transmission))) -- Capitalizar primeira letra
    END
    WHERE transmission IS NOT NULL;
  END IF;
END $$;

-- Normalizar cambio (coluna em português)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'cambio'
  ) THEN
    UPDATE public.vehicles
    SET cambio = CASE
      WHEN LOWER(cambio) IN ('automatico', 'automático', 'automatic', 'at', 'a/t') THEN 'Automático'
      WHEN LOWER(cambio) IN ('manual', 'mt', 'm/t') THEN 'Manual'
      WHEN LOWER(cambio) IN ('cvt') THEN 'CVT'
      WHEN LOWER(cambio) IN ('falta', 'não informado', 'nao informado', 'n/a', 'na') THEN NULL
      WHEN cambio IS NULL THEN NULL
      ELSE INITCAP(LOWER(TRIM(cambio))) -- Capitalizar primeira letra
    END
    WHERE cambio IS NOT NULL;
  END IF;
END $$;

-- ============================================
-- 4. COMENTÁRIOS
-- ============================================

COMMENT ON COLUMN public.vehicles.vehicle_type IS 'Tipo de veículo normalizado: Carro, Moto, Caminhão, Van, Ônibus';
COMMENT ON COLUMN public.vehicles.tipo_veiculo IS 'Tipo de veículo normalizado: carro, moto, caminhao, van, outros';
COMMENT ON COLUMN public.vehicles.fuel_type IS 'Combustível normalizado: Flex, Gasolina, Diesel, Etanol, Elétrico, Híbrido';
COMMENT ON COLUMN public.vehicles.combustivel IS 'Combustível normalizado: Flex, Gasolina, Diesel, Etanol, Elétrico, Híbrido';
COMMENT ON COLUMN public.vehicles.transmission IS 'Câmbio normalizado: Automático, Manual, CVT';
COMMENT ON COLUMN public.vehicles.cambio IS 'Câmbio normalizado: Automático, Manual, CVT';

