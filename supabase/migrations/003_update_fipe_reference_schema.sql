-- Ensure FIPE reference tables exist and add helper columns for canonical lookups

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fipe_vehicle_types'
  ) THEN
    CREATE TABLE public.fipe_vehicle_types (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fipe_brands'
  ) THEN
    CREATE TABLE public.fipe_brands (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      vehicle_type_id UUID NOT NULL REFERENCES public.fipe_vehicle_types(id) ON DELETE CASCADE,
      fipe_code TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE (vehicle_type_id, fipe_code)
    );
    CREATE INDEX idx_fipe_brands_vehicle_type ON public.fipe_brands(vehicle_type_id);
    CREATE INDEX idx_fipe_brands_name ON public.fipe_brands(name);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fipe_models'
  ) THEN
    CREATE TABLE public.fipe_models (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      brand_id UUID NOT NULL REFERENCES public.fipe_brands(id) ON DELETE CASCADE,
      fipe_code TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE (brand_id, fipe_code)
    );
    CREATE INDEX idx_fipe_models_brand ON public.fipe_models(brand_id);
    CREATE INDEX idx_fipe_models_name ON public.fipe_models(name);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fipe_model_years'
  ) THEN
    CREATE TABLE public.fipe_model_years (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      model_id UUID NOT NULL REFERENCES public.fipe_models(id) ON DELETE CASCADE,
      year_code TEXT NOT NULL,
      model_year INTEGER,
      fuel_label TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE (model_id, year_code)
    );
    CREATE INDEX idx_fipe_model_years_model ON public.fipe_model_years(model_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fipe_price_references'
  ) THEN
    CREATE TABLE public.fipe_price_references (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      model_year_id UUID NOT NULL REFERENCES public.fipe_model_years(id) ON DELETE CASCADE,
      reference_month DATE NOT NULL,
      currency TEXT NOT NULL DEFAULT 'BRL',
      price_cents INTEGER NOT NULL,
      raw_price_text TEXT,
      reference_label TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE (model_year_id, reference_month)
    );
    CREATE INDEX idx_fipe_price_references_model_year ON public.fipe_price_references(model_year_id);
    CREATE INDEX idx_fipe_price_references_month ON public.fipe_price_references(reference_month);
  END IF;
END $$;

-- Add canonical lookup columns to fipe_brands
ALTER TABLE public.fipe_brands
  ADD COLUMN IF NOT EXISTS name_upper TEXT,
  ADD COLUMN IF NOT EXISTS search_name TEXT;

UPDATE public.fipe_brands
SET
  name_upper = COALESCE(name_upper, UPPER(name)),
  search_name = COALESCE(
    search_name,
    regexp_replace(UPPER(name), '[^A-Z0-9]', '', 'g')
  )
WHERE name IS NOT NULL;

ALTER TABLE public.fipe_brands
  ALTER COLUMN name_upper SET NOT NULL,
  ALTER COLUMN search_name SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fipe_brands_name_upper ON public.fipe_brands(name_upper);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fipe_brands_vehicle_type_search_name
  ON public.fipe_brands(vehicle_type_id, search_name);

-- Add canonical lookup columns to fipe_models
ALTER TABLE public.fipe_models
  ADD COLUMN IF NOT EXISTS name_upper TEXT,
  ADD COLUMN IF NOT EXISTS base_name TEXT,
  ADD COLUMN IF NOT EXISTS base_name_upper TEXT,
  ADD COLUMN IF NOT EXISTS base_search_name TEXT;

UPDATE public.fipe_models
SET
  name_upper = COALESCE(name_upper, UPPER(name)),
  base_name = COALESCE(base_name, name),
  base_name_upper = COALESCE(base_name_upper, UPPER(name)),
  base_search_name = COALESCE(
    base_search_name,
    regexp_replace(UPPER(name), '[^A-Z0-9]', '', 'g')
  )
WHERE name IS NOT NULL;

ALTER TABLE public.fipe_models
  ALTER COLUMN name_upper SET NOT NULL,
  ALTER COLUMN base_name SET NOT NULL,
  ALTER COLUMN base_name_upper SET NOT NULL,
  ALTER COLUMN base_search_name SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fipe_models_name_upper ON public.fipe_models(name_upper);
CREATE INDEX IF NOT EXISTS idx_fipe_models_base_name_upper ON public.fipe_models(base_name_upper);
CREATE INDEX IF NOT EXISTS idx_fipe_models_base_search_name ON public.fipe_models(base_search_name);

-- Ensure updated_at triggers exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_fipe_brands_updated_at'
  ) THEN
    CREATE TRIGGER set_fipe_brands_updated_at
      BEFORE UPDATE ON public.fipe_brands
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_fipe_models_updated_at'
  ) THEN
    CREATE TRIGGER set_fipe_models_updated_at
      BEFORE UPDATE ON public.fipe_models
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_fipe_model_years_updated_at'
  ) THEN
    CREATE TRIGGER set_fipe_model_years_updated_at
      BEFORE UPDATE ON public.fipe_model_years
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_fipe_price_references_updated_at'
  ) THEN
    CREATE TRIGGER set_fipe_price_references_updated_at
      BEFORE UPDATE ON public.fipe_price_references
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

