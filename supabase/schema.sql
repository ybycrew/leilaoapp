-- LeilãoMax Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vehicles table
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  leiloeiro TEXT NOT NULL,
  leiloeiro_url TEXT NOT NULL,
  titulo TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  ano INTEGER,
  ano_modelo INTEGER,
  preco_inicial DECIMAL(10,2) NOT NULL,
  preco_atual DECIMAL(10,2) NOT NULL,
  km INTEGER,
  combustivel TEXT,
  cambio TEXT,
  cor TEXT,
  cidade TEXT NOT NULL,
  estado TEXT NOT NULL,
  tipo_veiculo TEXT CHECK (tipo_veiculo IN ('carro', 'moto', 'caminhao', 'van', 'outros')),
  tipo_leilao TEXT CHECK (tipo_leilao IN ('online', 'presencial', 'hibrido')),
  aceita_financiamento BOOLEAN DEFAULT false,
  data_leilao TIMESTAMP,
  imagens TEXT[],
  descricao TEXT,
  fipe_preco DECIMAL(10,2),
  fipe_codigo TEXT,
  deal_score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table (extends Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nome TEXT,
  plano TEXT CHECK (plano IN ('gratuito', 'mensal', 'anual')) DEFAULT 'gratuito',
  buscas_restantes INTEGER DEFAULT 5,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User favorites
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, vehicle_id)
);

-- User searches (history)
CREATE TABLE user_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filters JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  plano TEXT CHECK (plano IN ('mensal', 'anual')) NOT NULL,
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due')) DEFAULT 'active',
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_vehicles_estado ON vehicles(estado);
CREATE INDEX idx_vehicles_cidade ON vehicles(cidade);
CREATE INDEX idx_vehicles_marca ON vehicles(marca);
CREATE INDEX idx_vehicles_tipo_veiculo ON vehicles(tipo_veiculo);
CREATE INDEX idx_vehicles_deal_score ON vehicles(deal_score DESC);
CREATE INDEX idx_vehicles_preco ON vehicles(preco_atual);
CREATE INDEX idx_vehicles_data_leilao ON vehicles(data_leilao);
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_searches_user_id ON user_searches(user_id);

-- Full text search index
CREATE INDEX idx_vehicles_search ON vehicles USING gin(to_tsvector('portuguese', titulo || ' ' || COALESCE(marca, '') || ' ' || COALESCE(modelo, '')));

-- Row Level Security (RLS) Policies
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Vehicles are readable by everyone
CREATE POLICY "Vehicles are viewable by everyone" ON vehicles
  FOR SELECT USING (true);

-- Users can only read their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- User favorites policies
CREATE POLICY "Users can view own favorites" ON user_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON user_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- User searches policies
CREATE POLICY "Users can view own searches" ON user_searches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own searches" ON user_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
