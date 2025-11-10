-- Ensure optional columns in fipe_model_years accept null values
ALTER TABLE public.fipe_model_years
  ALTER COLUMN fuel_label DROP NOT NULL;

ALTER TABLE public.fipe_model_years
  ALTER COLUMN model_year DROP NOT NULL;

