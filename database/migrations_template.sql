-- ============================================
-- MIGRATIONS TEMPLATE - YBYBID
-- Templates e exemplos de migrations para o banco
-- ============================================

-- IMPORTANTE: 
-- - Sempre teste migrations em ambiente de desenvolvimento primeiro
-- - Use transações quando possível
-- - Documente cada migration
-- - Faça backup antes de aplicar em produção

-- ============================================
-- TEMPLATE 1: ADICIONAR NOVA COLUNA
-- ============================================

-- Migration: adicionar coluna vehicle_condition
-- Data: 2025-10-10
-- Autor: Equipe YbyBid
-- Descrição: Adicionar campo para condição detalhada do veículo

BEGIN;

-- Adicionar coluna
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS vehicle_condition TEXT;

-- Adicionar comentário
COMMENT ON COLUMN public.vehicles.vehicle_condition IS 
'Condição detalhada do veículo: Excelente, Bom, Regular, Ruim';

-- Criar índice se necessário
CREATE INDEX IF NOT EXISTS idx_vehicles_condition 
ON public.vehicles(vehicle_condition)
WHERE vehicle_condition IS NOT NULL;

-- Popular dados existentes (opcional)
UPDATE public.vehicles
SET vehicle_condition = condition
WHERE vehicle_condition IS NULL;

COMMIT;


-- ============================================
-- TEMPLATE 2: ADICIONAR NOVA TABELA
-- ============================================

-- Migration: criar tabela de avaliações de usuários
-- Data: 2025-10-10
-- Autor: Equipe YbyBid
-- Descrição: Permitir usuários avaliarem leiloeiros

BEGIN;

CREATE TABLE IF NOT EXISTS public.auctioneer_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    auctioneer_id UUID NOT NULL REFERENCES public.auctioneers(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Usuário só pode avaliar cada leiloeiro uma vez
    UNIQUE(user_id, auctioneer_id)
);

-- Índices
CREATE INDEX idx_auctioneer_reviews_user_id 
ON public.auctioneer_reviews(user_id);

CREATE INDEX idx_auctioneer_reviews_auctioneer_id 
ON public.auctioneer_reviews(auctioneer_id);

-- Trigger para updated_at
CREATE TRIGGER update_auctioneer_reviews_updated_at 
BEFORE UPDATE ON public.auctioneer_reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.auctioneer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all reviews"
ON public.auctioneer_reviews FOR SELECT
USING (true);

CREATE POLICY "Users can create their own reviews"
ON public.auctioneer_reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
ON public.auctioneer_reviews FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
ON public.auctioneer_reviews FOR DELETE
USING (auth.uid() = user_id);

COMMIT;


-- ============================================
-- TEMPLATE 3: MODIFICAR COLUNA EXISTENTE
-- ============================================

-- Migration: aumentar tamanho do campo description
-- Data: 2025-10-10
-- Autor: Equipe YbyBid

BEGIN;

-- Alterar tipo da coluna
ALTER TABLE public.vehicles 
ALTER COLUMN description TYPE TEXT;

-- Ou adicionar constraint
ALTER TABLE public.vehicles
ADD CONSTRAINT description_min_length 
CHECK (length(description) >= 10);

COMMIT;


-- ============================================
-- TEMPLATE 4: CRIAR NOVA FUNÇÃO
-- ============================================

-- Migration: adicionar função para calcular média de avaliações
-- Data: 2025-10-10
-- Autor: Equipe YbyBid

BEGIN;

CREATE OR REPLACE FUNCTION get_auctioneer_rating(p_auctioneer_id UUID)
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'average_rating', (
            SELECT ROUND(AVG(rating), 2)
            FROM public.auctioneer_reviews
            WHERE auctioneer_id = p_auctioneer_id
        ),
        'total_reviews', (
            SELECT COUNT(*)
            FROM public.auctioneer_reviews
            WHERE auctioneer_id = p_auctioneer_id
        ),
        'rating_distribution', (
            SELECT json_object_agg(rating, count)
            FROM (
                SELECT rating, COUNT(*) as count
                FROM public.auctioneer_reviews
                WHERE auctioneer_id = p_auctioneer_id
                GROUP BY rating
                ORDER BY rating DESC
            ) dist
        )
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;


-- ============================================
-- TEMPLATE 5: ADICIONAR ÍNDICE COMPOSTO
-- ============================================

-- Migration: otimizar busca por marca e modelo
-- Data: 2025-10-10
-- Autor: Equipe YbyBid

BEGIN;

-- Criar índice composto
CREATE INDEX IF NOT EXISTS idx_vehicles_brand_model_year_score 
ON public.vehicles(brand, model, year_model, deal_score DESC)
WHERE is_active = true;

-- Índice parcial para melhores negócios
CREATE INDEX IF NOT EXISTS idx_vehicles_best_deals 
ON public.vehicles(deal_score DESC, auction_date)
WHERE is_active = true AND deal_score >= 80;

COMMIT;


-- ============================================
-- TEMPLATE 6: MIGRAÇÃO DE DADOS
-- ============================================

-- Migration: normalizar nomes de marcas
-- Data: 2025-10-10
-- Autor: Equipe YbyBid

BEGIN;

-- Criar tabela temporária de mapeamento
CREATE TEMP TABLE brand_mapping (
    old_name TEXT,
    new_name TEXT
);

INSERT INTO brand_mapping VALUES
('CHEVROLET', 'Chevrolet'),
('chevrolet', 'Chevrolet'),
('FIAT', 'Fiat'),
('fiat', 'Fiat'),
('VOLKSWAGEN', 'Volkswagen'),
('volkswagen', 'Volkswagen'),
('VW', 'Volkswagen');

-- Atualizar dados
UPDATE public.vehicles v
SET brand = bm.new_name
FROM brand_mapping bm
WHERE v.brand = bm.old_name;

COMMIT;


-- ============================================
-- TEMPLATE 7: REMOVER COLUNA (CUIDADO!)
-- ============================================

-- Migration: remover coluna não utilizada
-- Data: 2025-10-10
-- Autor: Equipe YbyBid
-- ATENÇÃO: Esta operação é irreversível!

BEGIN;

-- Remover índice primeiro
DROP INDEX IF EXISTS idx_vehicles_old_field;

-- Remover coluna
ALTER TABLE public.vehicles 
DROP COLUMN IF EXISTS old_unused_field CASCADE;

COMMIT;


-- ============================================
-- TEMPLATE 8: RENOMEAR COLUNA
-- ============================================

-- Migration: renomear coluna para melhor clareza
-- Data: 2025-10-10
-- Autor: Equipe YbyBid

BEGIN;

-- Renomear coluna
ALTER TABLE public.vehicles 
RENAME COLUMN current_bid TO current_price;

-- Atualizar índices
DROP INDEX IF EXISTS idx_vehicles_current_bid;
CREATE INDEX idx_vehicles_current_price 
ON public.vehicles(current_price);

COMMIT;


-- ============================================
-- TEMPLATE 9: ADICIONAR CONSTRAINT
-- ============================================

-- Migration: adicionar validação de dados
-- Data: 2025-10-10
-- Autor: Equipe YbyBid

BEGIN;

-- Adicionar check constraint
ALTER TABLE public.vehicles
ADD CONSTRAINT valid_year_range 
CHECK (year_model >= 1900 AND year_model <= EXTRACT(YEAR FROM CURRENT_DATE) + 1);

ALTER TABLE public.vehicles
ADD CONSTRAINT valid_price 
CHECK (current_bid > 0);

ALTER TABLE public.vehicles
ADD CONSTRAINT valid_mileage 
CHECK (mileage >= 0);

COMMIT;


-- ============================================
-- TEMPLATE 10: CRIAR VIEW
-- ============================================

-- Migration: criar view para relatórios
-- Data: 2025-10-10
-- Autor: Equipe YbyBid

BEGIN;

CREATE OR REPLACE VIEW public.vehicles_report AS
SELECT 
    v.id,
    v.title,
    v.brand,
    v.model,
    v.year_model,
    v.current_bid,
    v.fipe_price,
    v.fipe_discount_percentage,
    v.deal_score,
    v.state,
    v.city,
    v.auction_date,
    v.views_count,
    v.favorites_count,
    a.name as auctioneer_name,
    a.website_url as auctioneer_url,
    (SELECT COUNT(*) FROM favorites f WHERE f.vehicle_id = v.id) as favorite_count
FROM public.vehicles v
INNER JOIN public.auctioneers a ON v.auctioneer_id = a.id
WHERE v.is_active = true;

-- Comentário
COMMENT ON VIEW public.vehicles_report IS 
'View consolidada de veículos com informações de leiloeiro';

COMMIT;


-- ============================================
-- TEMPLATE 11: ADICIONAR TRIGGER
-- ============================================

-- Migration: trigger para log de alterações
-- Data: 2025-10-10
-- Autor: Equipe YbyBid

BEGIN;

-- Criar tabela de audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar função de trigger
CREATE OR REPLACE FUNCTION log_vehicle_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, user_id)
        VALUES (
            'vehicles',
            NEW.id,
            'UPDATE',
            to_jsonb(OLD),
            to_jsonb(NEW),
            auth.uid()
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_log (table_name, record_id, action, old_data, user_id)
        VALUES (
            'vehicles',
            OLD.id,
            'DELETE',
            to_jsonb(OLD),
            auth.uid()
        );
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
CREATE TRIGGER vehicle_audit_trigger
AFTER UPDATE OR DELETE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION log_vehicle_changes();

COMMIT;


-- ============================================
-- TEMPLATE 12: OTIMIZAÇÃO DE PERFORMANCE
-- ============================================

-- Migration: otimizações de performance
-- Data: 2025-10-10
-- Autor: Equipe YbyBid

BEGIN;

-- Atualizar estatísticas
ANALYZE public.vehicles;
ANALYZE public.favorites;
ANALYZE public.search_history;

-- Criar índice BRIN para timestamps (eficiente para dados ordenados)
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at_brin 
ON public.vehicles USING BRIN (created_at);

-- Particionar tabela search_history por data (exemplo)
-- Nota: Requer planejamento cuidadoso
-- CREATE TABLE search_history_2025_10 PARTITION OF search_history
-- FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

COMMIT;


-- ============================================
-- TEMPLATE 13: ROLLBACK (REVERTER MIGRATION)
-- ============================================

-- Rollback: reverter adição de coluna vehicle_condition
-- Data: 2025-10-10
-- Autor: Equipe YbyBid

BEGIN;

-- Remover índice
DROP INDEX IF EXISTS idx_vehicles_condition;

-- Remover coluna
ALTER TABLE public.vehicles 
DROP COLUMN IF EXISTS vehicle_condition;

COMMIT;


-- ============================================
-- TEMPLATE 14: ATUALIZAR FUNÇÃO EXISTENTE
-- ============================================

-- Migration: melhorar função search_vehicles
-- Data: 2025-10-10
-- Autor: Equipe YbyBid

BEGIN;

-- Substituir função existente
CREATE OR REPLACE FUNCTION search_vehicles(
    -- adicione novos parâmetros aqui
    p_vehicle_condition TEXT[] DEFAULT NULL,
    -- ... outros parâmetros existentes ...
    p_search_text TEXT DEFAULT NULL
)
RETURNS TABLE (
    -- definição da tabela de retorno
    id UUID
) AS $$
BEGIN
    -- nova implementação
    RETURN QUERY
    SELECT v.id
    FROM public.vehicles v
    WHERE 
        (p_vehicle_condition IS NULL OR v.vehicle_condition = ANY(p_vehicle_condition))
        -- ... outras condições ...
    ;
END;
$$ LANGUAGE plpgsql;

COMMIT;


-- ============================================
-- BOAS PRÁTICAS DE MIGRATIONS
-- ============================================

/*
1. SEMPRE usar transações (BEGIN/COMMIT)
2. Testar em ambiente de desenvolvimento primeiro
3. Fazer backup antes de aplicar em produção
4. Documentar cada migration (data, autor, descrição)
5. Nomear migrations com timestamp: YYYYMMDD_HHMM_description.sql
6. Criar migrations reversíveis quando possível
7. Evitar migrations que bloqueiam a tabela por muito tempo
8. Usar IF NOT EXISTS para idempotência
9. Atualizar ANALYZE após mudanças estruturais grandes
10. Monitorar performance após aplicar migrations

ESTRUTURA DE ARQUIVO SUGERIDA:
migrations/
├── 20251010_1200_add_vehicle_condition.sql
├── 20251010_1300_create_reviews_table.sql
├── 20251010_1400_add_brand_indexes.sql
└── ...

EXEMPLO DE MIGRATION COMPLETA:
*/

-- ============================================
-- Migration: 20251010_1500_add_notifications
-- Data: 2025-10-10 15:00
-- Autor: João Silva
-- Descrição: Adicionar sistema de notificações push
-- Reversível: Sim (ver rollback no final)
-- Tempo estimado: 2 minutos
-- ============================================

BEGIN;

-- 1. Criar tabela
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

-- 3. Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- 5. Criar função auxiliar
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.notifications
        WHERE user_id = p_user_id AND is_read = FALSE
    );
END;
$$ LANGUAGE plpgsql;

-- 6. Documentar
COMMENT ON TABLE public.notifications IS 
'Sistema de notificações push para usuários';

COMMIT;

-- Rollback (se necessário):
/*
BEGIN;
DROP FUNCTION IF EXISTS get_unread_notifications_count;
DROP TABLE IF EXISTS public.notifications CASCADE;
COMMIT;
*/

