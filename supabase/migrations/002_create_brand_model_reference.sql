-- Tabela de referência de marcas e modelos válidos da FIPE
-- Esta tabela armazena marcas e modelos válidos da API FIPE para validação

CREATE TABLE IF NOT EXISTS brand_model_reference (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('carros', 'motos', 'caminhoes')),
  fipe_brand_code TEXT NOT NULL,
  fipe_brand_name TEXT NOT NULL,
  fipe_model_code TEXT,
  fipe_model_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(vehicle_type, fipe_brand_code, fipe_model_code)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_brand_model_ref_vehicle_type ON brand_model_reference(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_brand_model_ref_brand_code ON brand_model_reference(fipe_brand_code);
CREATE INDEX IF NOT EXISTS idx_brand_model_ref_brand_name ON brand_model_reference(fipe_brand_name);
CREATE INDEX IF NOT EXISTS idx_brand_model_ref_model_name ON brand_model_reference(fipe_model_name);
CREATE INDEX IF NOT EXISTS idx_brand_model_ref_active ON brand_model_reference(is_active);

-- Índice composto para busca rápida
CREATE INDEX IF NOT EXISTS idx_brand_model_ref_lookup ON brand_model_reference(vehicle_type, fipe_brand_code, is_active);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_brand_model_ref_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_brand_model_ref_updated_at
  BEFORE UPDATE ON brand_model_reference
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_model_ref_updated_at();

-- Comentários
COMMENT ON TABLE brand_model_reference IS 'Tabela de referência de marcas e modelos válidos da API FIPE';
COMMENT ON COLUMN brand_model_reference.vehicle_type IS 'Tipo de veículo: carros, motos ou caminhoes';
COMMENT ON COLUMN brand_model_reference.fipe_brand_code IS 'Código da marca na API FIPE';
COMMENT ON COLUMN brand_model_reference.fipe_brand_name IS 'Nome da marca na API FIPE';
COMMENT ON COLUMN brand_model_reference.fipe_model_code IS 'Código do modelo na API FIPE (NULL para apenas marcas)';
COMMENT ON COLUMN brand_model_reference.fipe_model_name IS 'Nome do modelo na API FIPE (NULL para apenas marcas)';
COMMENT ON COLUMN brand_model_reference.is_active IS 'Indica se o registro está ativo (marcas/modelos podem ser descontinuados)';

