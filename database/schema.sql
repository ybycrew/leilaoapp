-- ============================================
-- SCHEMA SQL COMPLETO - YBYBID
-- Plataforma de Agregação de Leilões de Veículos
-- ============================================

-- ============================================
-- 1. EXTENSÕES NECESSÁRIAS
-- ============================================

-- Habilitar extensão UUID para geração automática de IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Habilitar extensão para busca textual em português
CREATE EXTENSION IF NOT EXISTS "unaccent";


-- ============================================
-- 2. TABELA DE USUÁRIOS
-- ============================================
-- Nota: O Supabase Auth já cria uma tabela auth.users
-- Esta tabela complementa com informações adicionais do perfil

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    search_count INTEGER DEFAULT 0, -- Contador de buscas realizadas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para consultas por email
CREATE INDEX idx_profiles_email ON public.profiles(email);


-- ============================================
-- 3. TABELA DE PLANOS
-- ============================================

CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- "Gratuito", "Mensal", "Anual"
    price DECIMAL(10, 2) NOT NULL,
    interval TEXT NOT NULL, -- "month", "year", "free"
    search_limit INTEGER, -- NULL = ilimitado, número = limite de buscas
    features JSONB, -- Array de features do plano
    is_active BOOLEAN DEFAULT TRUE,
    stripe_price_id TEXT, -- ID do preço no Stripe/Mercado Pago
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir planos padrão
INSERT INTO public.plans (name, price, interval, search_limit, features) VALUES
('Gratuito', 0, 'free', 5, '["5 buscas gratuitas", "Filtros básicos", "Visualização de veículos"]'),
('Mensal', 119.00, 'month', NULL, '["Buscas ilimitadas", "Todos os filtros", "Sistema de favoritos", "Histórico de buscas", "Alertas por email"]'),
('Anual', 990.00, 'year', NULL, '["Buscas ilimitadas", "Todos os filtros", "Sistema de favoritos", "Histórico de buscas", "Alertas por email", "Acesso prioritário", "Desconto de 30%"]');


-- ============================================
-- 4. TABELA DE ASSINATURAS
-- ============================================

CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    status TEXT NOT NULL DEFAULT 'active', -- "active", "cancelled", "expired", "pending"
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    stripe_subscription_id TEXT, -- ID da assinatura no Stripe
    stripe_customer_id TEXT, -- ID do cliente no Stripe
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);


-- ============================================
-- 5. TABELA DE LEILOEIROS
-- ============================================

CREATE TABLE public.auctioneers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE, -- URL-friendly name
    website_url TEXT NOT NULL,
    logo_url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    scraping_config JSONB, -- Configurações específicas de scraping
    last_scrape_at TIMESTAMP WITH TIME ZONE,
    scrape_frequency_hours INTEGER DEFAULT 12,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice
CREATE INDEX idx_auctioneers_slug ON public.auctioneers(slug);
CREATE INDEX idx_auctioneers_is_active ON public.auctioneers(is_active);


-- ============================================
-- 6. TABELA DE VEÍCULOS
-- ============================================

CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auctioneer_id UUID NOT NULL REFERENCES public.auctioneers(id) ON DELETE CASCADE,
    
    -- Identificação
    external_id TEXT, -- ID no site do leiloeiro
    lot_number TEXT, -- Número do lote
    
    -- Informações básicas
    title TEXT NOT NULL,
    description TEXT,
    brand TEXT NOT NULL, -- Marca (Chevrolet, Fiat, etc.)
    model TEXT NOT NULL, -- Modelo (Onix, Argo, etc.)
    version TEXT, -- Versão específica
    year_manufacture INTEGER, -- Ano de fabricação
    year_model INTEGER, -- Ano do modelo
    
    -- Características
    vehicle_type TEXT, -- "Carro", "Moto", "Caminhão", "Van", etc.
    color TEXT,
    fuel_type TEXT, -- "Flex", "Gasolina", "Diesel", "Elétrico", etc.
    transmission TEXT, -- "Manual", "Automático", "CVT", etc.
    mileage INTEGER, -- KM rodados
    license_plate TEXT,
    
    -- Localização
    state TEXT NOT NULL, -- UF
    city TEXT NOT NULL,
    
    -- Preços e valores
    current_bid DECIMAL(10, 2), -- Lance atual
    minimum_bid DECIMAL(10, 2), -- Lance mínimo
    appraised_value DECIMAL(10, 2), -- Valor de avaliação
    fipe_price DECIMAL(10, 2), -- Preço FIPE
    fipe_code TEXT, -- Código FIPE
    
    -- Leilão
    auction_date TIMESTAMP WITH TIME ZONE,
    auction_type TEXT, -- "Presencial", "Online", "Híbrido"
    auction_status TEXT DEFAULT 'scheduled', -- "scheduled", "ongoing", "finished", "cancelled"
    
    -- Condições
    has_financing BOOLEAN DEFAULT FALSE, -- Veículo possui financiamento
    accepts_financing BOOLEAN DEFAULT FALSE, -- Aceita financiamento na compra
    condition TEXT, -- "Novo", "Usado", "Batido", "Sinistrado"
    
    -- Score e análise
    deal_score INTEGER, -- Score de 0 a 100
    fipe_discount_percentage DECIMAL(5, 2), -- Percentual de desconto em relação ao FIPE
    
    -- URLs
    original_url TEXT NOT NULL, -- URL no site do leiloeiro
    thumbnail_url TEXT, -- URL da imagem principal
    
    -- Metadados
    is_active BOOLEAN DEFAULT TRUE,
    views_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para evitar duplicatas
    UNIQUE(auctioneer_id, external_id)
);

-- Índices para performance
CREATE INDEX idx_vehicles_auctioneer_id ON public.vehicles(auctioneer_id);
CREATE INDEX idx_vehicles_brand ON public.vehicles(brand);
CREATE INDEX idx_vehicles_model ON public.vehicles(model);
CREATE INDEX idx_vehicles_vehicle_type ON public.vehicles(vehicle_type);
CREATE INDEX idx_vehicles_state ON public.vehicles(state);
CREATE INDEX idx_vehicles_city ON public.vehicles(city);
CREATE INDEX idx_vehicles_current_bid ON public.vehicles(current_bid);
CREATE INDEX idx_vehicles_deal_score ON public.vehicles(deal_score);
CREATE INDEX idx_vehicles_auction_date ON public.vehicles(auction_date);
CREATE INDEX idx_vehicles_is_active ON public.vehicles(is_active);
CREATE INDEX idx_vehicles_year_model ON public.vehicles(year_model);
CREATE INDEX idx_vehicles_fuel_type ON public.vehicles(fuel_type);
CREATE INDEX idx_vehicles_has_financing ON public.vehicles(has_financing);

-- Índice de busca textual
CREATE INDEX idx_vehicles_search ON public.vehicles USING GIN (
    to_tsvector('portuguese', 
        COALESCE(title, '') || ' ' || 
        COALESCE(brand, '') || ' ' || 
        COALESCE(model, '') || ' ' || 
        COALESCE(description, '')
    )
);


-- ============================================
-- 7. TABELA DE IMAGENS DOS VEÍCULOS
-- ============================================

CREATE TABLE public.vehicle_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    storage_path TEXT, -- Caminho no Supabase Storage
    is_primary BOOLEAN DEFAULT FALSE, -- Imagem principal
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_vehicle_images_vehicle_id ON public.vehicle_images(vehicle_id);
CREATE INDEX idx_vehicle_images_is_primary ON public.vehicle_images(vehicle_id, is_primary);


-- ============================================
-- 8. TABELA DE FAVORITOS
-- ============================================

CREATE TABLE public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    notes TEXT, -- Notas pessoais do usuário sobre o veículo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Evitar duplicatas
    UNIQUE(user_id, vehicle_id)
);

-- Índices
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_vehicle_id ON public.favorites(vehicle_id);


-- ============================================
-- 9. TABELA DE HISTÓRICO DE BUSCAS
-- ============================================

CREATE TABLE public.search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    filters JSONB NOT NULL, -- Filtros aplicados na busca
    results_count INTEGER, -- Quantidade de resultados encontrados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX idx_search_history_created_at ON public.search_history(created_at DESC);


-- ============================================
-- 10. TABELA DE FILTROS SALVOS
-- ============================================

CREATE TABLE public.saved_filters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Nome dado pelo usuário ao filtro
    filters JSONB NOT NULL, -- Configuração dos filtros
    is_active BOOLEAN DEFAULT TRUE,
    alert_enabled BOOLEAN DEFAULT FALSE, -- Se deve enviar alertas quando novos veículos corresponderem
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_saved_filters_user_id ON public.saved_filters(user_id);
CREATE INDEX idx_saved_filters_alert_enabled ON public.saved_filters(alert_enabled);


-- ============================================
-- 11. TABELA DE LOGS DE SCRAPING
-- ============================================

CREATE TABLE public.scraping_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auctioneer_id UUID REFERENCES public.auctioneers(id) ON DELETE SET NULL,
    status TEXT NOT NULL, -- "success", "error", "partial"
    vehicles_scraped INTEGER DEFAULT 0,
    vehicles_created INTEGER DEFAULT 0,
    vehicles_updated INTEGER DEFAULT 0,
    error_message TEXT,
    execution_time_ms INTEGER, -- Tempo de execução em milissegundos
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB -- Informações adicionais sobre a execução
);

-- Índices
CREATE INDEX idx_scraping_logs_auctioneer_id ON public.scraping_logs(auctioneer_id);
CREATE INDEX idx_scraping_logs_started_at ON public.scraping_logs(started_at DESC);
CREATE INDEX idx_scraping_logs_status ON public.scraping_logs(status);


-- ============================================
-- 12. TABELA DE ALERTAS
-- ============================================

CREATE TABLE public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    saved_filter_id UUID REFERENCES public.saved_filters(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE,
    was_clicked BOOLEAN DEFAULT FALSE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX idx_alerts_vehicle_id ON public.alerts(vehicle_id);
CREATE INDEX idx_alerts_sent_at ON public.alerts(sent_at);


-- ============================================
-- 13. TABELA DE PREÇOS FIPE (CACHE)
-- ============================================

CREATE TABLE public.fipe_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fipe_code TEXT NOT NULL UNIQUE,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    fuel_type TEXT,
    price DECIMAL(10, 2) NOT NULL,
    reference_month TEXT, -- Mês de referência da tabela FIPE (ex: "janeiro/2025")
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_fipe_prices_fipe_code ON public.fipe_prices(fipe_code);
CREATE INDEX idx_fipe_prices_brand_model ON public.fipe_prices(brand, model);


-- ============================================
-- 14. FUNÇÕES E TRIGGERS
-- ============================================

-- Função para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de updated_at em todas as tabelas relevantes
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auctioneers_updated_at BEFORE UPDATE ON public.auctioneers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_filters_updated_at BEFORE UPDATE ON public.saved_filters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fipe_prices_updated_at BEFORE UPDATE ON public.fipe_prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- Função para atualizar contador de favoritos no veículo
CREATE OR REPLACE FUNCTION update_vehicle_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.vehicles
        SET favorites_count = favorites_count + 1
        WHERE id = NEW.vehicle_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.vehicles
        SET favorites_count = favorites_count - 1
        WHERE id = OLD.vehicle_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contador de favoritos
CREATE TRIGGER update_favorites_count AFTER INSERT OR DELETE ON public.favorites
    FOR EACH ROW EXECUTE FUNCTION update_vehicle_favorites_count();


-- Função para criar perfil automaticamente quando usuário é criado no auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================
-- 15. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Políticas para subscriptions
CREATE POLICY "Users can view their own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Políticas para favorites
CREATE POLICY "Users can view their own favorites"
    ON public.favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
    ON public.favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
    ON public.favorites FOR DELETE
    USING (auth.uid() = user_id);

-- Políticas para search_history
CREATE POLICY "Users can view their own search history"
    ON public.search_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history"
    ON public.search_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Políticas para saved_filters
CREATE POLICY "Users can view their own saved filters"
    ON public.saved_filters FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved filters"
    ON public.saved_filters FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved filters"
    ON public.saved_filters FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved filters"
    ON public.saved_filters FOR DELETE
    USING (auth.uid() = user_id);

-- Políticas para alerts
CREATE POLICY "Users can view their own alerts"
    ON public.alerts FOR SELECT
    USING (auth.uid() = user_id);

-- Tabelas públicas (leitura para todos autenticados)
-- vehicles, auctioneers, plans, fipe_prices são públicas para leitura

CREATE POLICY "Anyone can view active vehicles"
    ON public.vehicles FOR SELECT
    USING (is_active = true);

CREATE POLICY "Anyone can view active auctioneers"
    ON public.auctioneers FOR SELECT
    USING (is_active = true);

CREATE POLICY "Anyone can view active plans"
    ON public.plans FOR SELECT
    USING (is_active = true);

CREATE POLICY "Anyone can view fipe prices"
    ON public.fipe_prices FOR SELECT
    USING (true);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctioneers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fipe_prices ENABLE ROW LEVEL SECURITY;


-- ============================================
-- 16. VIEWS ÚTEIS
-- ============================================

-- View para veículos com informações do leiloeiro
CREATE OR REPLACE VIEW public.vehicles_with_auctioneer AS
SELECT 
    v.*,
    a.name as auctioneer_name,
    a.slug as auctioneer_slug,
    a.logo_url as auctioneer_logo
FROM public.vehicles v
INNER JOIN public.auctioneers a ON v.auctioneer_id = a.id
WHERE v.is_active = true;

-- View para usuários com informações de assinatura
CREATE OR REPLACE VIEW public.users_with_subscription AS
SELECT 
    p.*,
    s.status as subscription_status,
    s.current_period_end,
    pl.name as plan_name,
    pl.search_limit,
    CASE 
        WHEN pl.search_limit IS NULL THEN true
        WHEN p.search_count < pl.search_limit THEN true
        ELSE false
    END as can_search
FROM public.profiles p
LEFT JOIN public.subscriptions s ON p.id = s.user_id AND s.status = 'active'
LEFT JOIN public.plans pl ON s.plan_id = pl.id;


-- ============================================
-- 17. ÍNDICES COMPOSTOS ADICIONAIS
-- ============================================

-- Para filtros combinados comuns
CREATE INDEX idx_vehicles_brand_model_year ON public.vehicles(brand, model, year_model);
CREATE INDEX idx_vehicles_state_city ON public.vehicles(state, city);
CREATE INDEX idx_vehicles_type_brand ON public.vehicles(vehicle_type, brand);
CREATE INDEX idx_vehicles_active_score ON public.vehicles(is_active, deal_score DESC) WHERE is_active = true;
CREATE INDEX idx_vehicles_active_date ON public.vehicles(is_active, auction_date) WHERE is_active = true;


-- ============================================
-- SCRIPT COMPLETO
-- ============================================
-- Este schema fornece uma estrutura completa para:
-- ✅ Autenticação e perfis de usuário
-- ✅ Sistema de planos e assinaturas
-- ✅ Catálogo de veículos com múltiplos filtros
-- ✅ Leiloeiros e suas configurações
-- ✅ Sistema de favoritos
-- ✅ Histórico de buscas
-- ✅ Filtros salvos e alertas
-- ✅ Cache de preços FIPE
-- ✅ Logs de scraping
-- ✅ Row Level Security (RLS)
-- ✅ Triggers automáticos
-- ✅ Índices otimizados para performance

