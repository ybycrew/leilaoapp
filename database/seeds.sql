-- ============================================
-- SEEDS - YBYBID
-- Dados iniciais para desenvolvimento e testes
-- ============================================

-- ============================================
-- 1. LEILOEIROS (Principais do Brasil)
-- ============================================

INSERT INTO public.auctioneers (name, slug, website_url, logo_url, description, scrape_frequency_hours) VALUES
('Sodré Santoro', 'sodre-santoro', 'https://www.sodresantoro.com.br', NULL, 'Um dos maiores leiloeiros do Brasil, especializado em veículos de bancos e seguradoras.', 12),
('Superbid', 'superbid', 'https://www.superbid.net', NULL, 'Maior plataforma de leilões online do Brasil.', 6),
('Leilões VIP', 'leiloes-vip', 'https://www.leiloesvip.com.br', NULL, 'Leiloeiro especializado em veículos de luxo e importados.', 12),
('Sette Leilões', 'sette-leiloes', 'https://www.setteleiloes.com.br', NULL, 'Leiloeiro tradicional com atuação em todo Brasil.', 12),
('Zukerman Leilões', 'zukerman-leiloes', 'https://www.zukerman.com.br', NULL, 'Leiloeiro com foco em veículos de locadoras.', 12),
('Leiloeira Avenida', 'leiloeira-avenida', 'https://www.leiloeiraavenida.com.br', NULL, 'Especializada em veículos usados e seminovos.', 12),
('Leilões JL', 'leiloes-jl', 'https://www.leiloesjl.com.br', NULL, 'Leiloeiro regional com boa presença no Sudeste.', 12),
('Brasil Leilões', 'brasil-leiloes', 'https://www.brasilleiloes.com.br', NULL, 'Leilões de veículos de diversos segmentos.', 12),
('Pátio de Leilões', 'patio-de-leiloes', 'https://www.patiodeleiloes.com.br', NULL, 'Especializado em veículos de órgãos públicos.', 24),
('Lance Certo', 'lance-certo', 'https://www.lancecerto.com.br', NULL, 'Plataforma online de leilões judiciais e extrajudiciais.', 12)
ON CONFLICT (slug) DO NOTHING;


-- ============================================
-- 2. PLANOS (Já inseridos no schema.sql)
-- ============================================
-- Os planos já são criados automaticamente no schema principal


-- ============================================
-- 3. VEÍCULOS DE EXEMPLO (Para desenvolvimento)
-- ============================================

-- Obter IDs dos leiloeiros para usar nos veículos
DO $$
DECLARE
    sodre_id UUID;
    superbid_id UUID;
    vip_id UUID;
BEGIN
    SELECT id INTO sodre_id FROM public.auctioneers WHERE slug = 'sodre-santoro' LIMIT 1;
    SELECT id INTO superbid_id FROM public.auctioneers WHERE slug = 'superbid' LIMIT 1;
    SELECT id INTO vip_id FROM public.auctioneers WHERE slug = 'leiloes-vip' LIMIT 1;

    -- Veículos populares com bom deal score
    INSERT INTO public.vehicles (
        auctioneer_id, external_id, lot_number, title, brand, model, version,
        year_manufacture, year_model, vehicle_type, color, fuel_type, transmission,
        mileage, license_plate, state, city, current_bid, minimum_bid, appraised_value,
        fipe_price, auction_date, auction_type, has_financing, condition, deal_score,
        fipe_discount_percentage, original_url, thumbnail_url
    ) VALUES
    -- Chevrolet Onix
    (sodre_id, 'EXT001', '12345', 'Chevrolet Onix 1.0 LT Turbo', 'Chevrolet', 'Onix', '1.0 LT Turbo',
     2022, 2023, 'Carro', 'Prata', 'Flex', 'Manual', 35000, 'ABC1D23', 'SP', 'São Paulo',
     45000.00, 40000.00, 52000.00, 65000.00, NOW() + INTERVAL '15 days', 'Online', false, 'Usado',
     85, 30.77, 'https://sodresantoro.com.br/lote/12345', 'https://images.unsplash.com/photo-1583121274602-3e2820c69888'),
    
    -- Fiat Argo
    (superbid_id, 'EXT002', '67890', 'Fiat Argo 1.3 Drive', 'Fiat', 'Argo', '1.3 Drive',
     2021, 2022, 'Carro', 'Vermelho', 'Flex', 'Manual', 42000, 'XYZ5E67', 'RJ', 'Rio de Janeiro',
     38000.00, 35000.00, 45000.00, 55000.00, NOW() + INTERVAL '10 days', 'Online', false, 'Usado',
     82, 30.91, 'https://superbid.net/lote/67890', 'https://images.unsplash.com/photo-1542362567-b07e54358753'),
    
    -- Honda Civic
    (vip_id, 'EXT003', '11111', 'Honda Civic 2.0 EXL', 'Honda', 'Civic', '2.0 EXL',
     2020, 2020, 'Carro', 'Preto', 'Flex', 'Automático', 58000, 'QWE8R90', 'SP', 'Campinas',
     75000.00, 70000.00, 88000.00, 95000.00, NOW() + INTERVAL '20 days', 'Presencial', false, 'Usado',
     78, 21.05, 'https://leiloesvip.com.br/lote/11111', 'https://images.unsplash.com/photo-1590362891991-f776e747a588'),
    
    -- Volkswagen Gol
    (sodre_id, 'EXT004', '22222', 'Volkswagen Gol 1.6 MSI', 'Volkswagen', 'Gol', '1.6 MSI',
     2019, 2020, 'Carro', 'Branco', 'Flex', 'Manual', 68000, 'ASD2F34', 'MG', 'Belo Horizonte',
     28000.00, 25000.00, 32000.00, 42000.00, NOW() + INTERVAL '8 days', 'Online', false, 'Usado',
     88, 33.33, 'https://sodresantoro.com.br/lote/22222', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d'),
    
    -- Toyota Corolla
    (superbid_id, 'EXT005', '33333', 'Toyota Corolla 2.0 XEI', 'Toyota', 'Corolla', '2.0 XEI',
     2021, 2022, 'Carro', 'Prata', 'Flex', 'Automático', 45000, 'ZXC9V12', 'PR', 'Curitiba',
     82000.00, 75000.00, 95000.00, 105000.00, NOW() + INTERVAL '12 days', 'Híbrido', false, 'Usado',
     80, 21.90, 'https://superbid.net/lote/33333', 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb'),
    
    -- Jeep Renegade
    (vip_id, 'EXT006', '44444', 'Jeep Renegade Sport 1.8', 'Jeep', 'Renegade', 'Sport 1.8',
     2020, 2021, 'SUV', 'Azul', 'Flex', 'Automático', 52000, 'FGH3J45', 'RS', 'Porto Alegre',
     68000.00, 65000.00, 78000.00, 88000.00, NOW() + INTERVAL '18 days', 'Online', false, 'Usado',
     83, 22.73, 'https://leiloesvip.com.br/lote/44444', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6'),
    
    -- Hyundai HB20
    (sodre_id, 'EXT007', '55555', 'Hyundai HB20 1.0 Sense', 'Hyundai', 'HB20', '1.0 Sense',
     2022, 2023, 'Carro', 'Branco', 'Flex', 'Manual', 18000, 'TYU6K78', 'BA', 'Salvador',
     42000.00, 38000.00, 48000.00, 58000.00, NOW() + INTERVAL '14 days', 'Online', false, 'Usado',
     90, 27.59, 'https://sodresantoro.com.br/lote/55555', 'https://images.unsplash.com/photo-1611821064430-dcd61c4e5cfc'),
    
    -- Renault Kwid
    (superbid_id, 'EXT008', '66666', 'Renault Kwid 1.0 Zen', 'Renault', 'Kwid', '1.0 Zen',
     2021, 2022, 'Carro', 'Laranja', 'Flex', 'Manual', 32000, 'VBN7M89', 'CE', 'Fortaleza',
     32000.00, 28000.00, 36000.00, 45000.00, NOW() + INTERVAL '9 days', 'Online', false, 'Usado',
     86, 28.89, 'https://superbid.net/lote/66666', 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2'),
    
    -- Ford Ranger
    (vip_id, 'EXT009', '77777', 'Ford Ranger XLT 3.2 Diesel 4x4', 'Ford', 'Ranger', 'XLT 3.2 Diesel 4x4',
     2019, 2020, 'Caminhonete', 'Cinza', 'Diesel', 'Automático', 85000, 'IOP8N90', 'MT', 'Cuiabá',
     125000.00, 115000.00, 145000.00, 165000.00, NOW() + INTERVAL '22 days', 'Presencial', false, 'Usado',
     75, 24.24, 'https://leiloesvip.com.br/lote/77777', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf'),
    
    -- Nissan Kicks
    (sodre_id, 'EXT010', '88888', 'Nissan Kicks 1.6 SV', 'Nissan', 'Kicks', '1.6 SV',
     2021, 2022, 'SUV', 'Vermelho', 'Flex', 'Automático', 38000, 'JKL1Q23', 'GO', 'Goiânia',
     62000.00, 58000.00, 72000.00, 82000.00, NOW() + INTERVAL '16 days', 'Online', false, 'Usado',
     81, 24.39, 'https://sodresantoro.com.br/lote/88888', 'https://images.unsplash.com/photo-1609521263047-f8f205293f24'),
    
    -- Volkswagen T-Cross
    (superbid_id, 'EXT011', '99999', 'Volkswagen T-Cross 200 TSI', 'Volkswagen', 'T-Cross', '200 TSI',
     2020, 2021, 'SUV', 'Branco', 'Flex', 'Automático', 48000, 'WER4T56', 'SC', 'Florianópolis',
     70000.00, 65000.00, 82000.00, 92000.00, NOW() + INTERVAL '11 days', 'Híbrido', false, 'Usado',
     79, 23.91, 'https://superbid.net/lote/99999', 'https://images.unsplash.com/photo-1619405399517-d7fce0f13302'),
    
    -- Chevrolet S10
    (vip_id, 'EXT012', '10101', 'Chevrolet S10 LTZ 2.8 Diesel 4x4', 'Chevrolet', 'S10', 'LTZ 2.8 Diesel 4x4',
     2018, 2019, 'Caminhonete', 'Preto', 'Diesel', 'Automático', 95000, 'SDC5Y67', 'MS', 'Campo Grande',
     110000.00, 100000.00, 128000.00, 145000.00, NOW() + INTERVAL '25 days', 'Presencial', true, 'Usado',
     72, 24.14, 'https://leiloesvip.com.br/lote/10101', 'https://images.unsplash.com/photo-1605317112018-4e3da0e2149a'),
    
    -- Fiat Toro
    (sodre_id, 'EXT013', '20202', 'Fiat Toro Freedom 1.8', 'Fiat', 'Toro', 'Freedom 1.8',
     2020, 2021, 'Caminhonete', 'Branco', 'Flex', 'Automático', 62000, 'FVG8U90', 'DF', 'Brasília',
     72000.00, 68000.00, 84000.00, 95000.00, NOW() + INTERVAL '13 days', 'Online', false, 'Usado',
     77, 24.21, 'https://sodresantoro.com.br/lote/20202', 'https://images.unsplash.com/photo-1567818735868-e71b99932e29'),
    
    -- Peugeot 208
    (superbid_id, 'EXT014', '30303', 'Peugeot 208 Griffe 1.6', 'Peugeot', '208', 'Griffe 1.6',
     2019, 2020, 'Carro', 'Vermelho', 'Flex', 'Automático', 55000, 'BNH9I12', 'PE', 'Recife',
     42000.00, 38000.00, 48000.00, 58000.00, NOW() + INTERVAL '17 days', 'Online', false, 'Usado',
     84, 27.59, 'https://superbid.net/lote/30303', 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068'),
    
    -- Honda HR-V
    (vip_id, 'EXT015', '40404', 'Honda HR-V EX 1.8', 'Honda', 'HR-V', 'EX 1.8',
     2020, 2021, 'SUV', 'Cinza', 'Flex', 'Automático', 48000, 'MKI0L34', 'ES', 'Vitória',
     78000.00, 72000.00, 92000.00, 102000.00, NOW() + INTERVAL '19 days', 'Híbrido', false, 'Usado',
     80, 23.53, 'https://leiloesvip.com.br/lote/40404', 'https://images.unsplash.com/photo-1580273916550-e323be2ae537');

    -- Calcular deal score para todos os veículos
    UPDATE public.vehicles
    SET deal_score = calculate_deal_score(
        fipe_discount_percentage,
        year_model,
        mileage,
        auction_type,
        has_financing
    );
END $$;


-- ============================================
-- 4. IMAGENS DOS VEÍCULOS
-- ============================================

-- Adicionar múltiplas imagens para cada veículo
-- (Em produção, essas seriam imagens reais do scraping)

DO $$
DECLARE
    vehicle_rec RECORD;
    img_urls TEXT[] := ARRAY[
        'https://images.unsplash.com/photo-1583121274602-3e2820c69888',
        'https://images.unsplash.com/photo-1542362567-b07e54358753',
        'https://images.unsplash.com/photo-1590362891991-f776e747a588',
        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d'
    ];
    i INTEGER;
BEGIN
    FOR vehicle_rec IN SELECT id FROM public.vehicles LIMIT 5 LOOP
        FOR i IN 1..4 LOOP
            INSERT INTO public.vehicle_images (vehicle_id, url, is_primary, display_order)
            VALUES (
                vehicle_rec.id,
                img_urls[i],
                i = 1,
                i
            );
        END LOOP;
    END LOOP;
END $$;


-- ============================================
-- 5. PREÇOS FIPE DE EXEMPLO
-- ============================================

INSERT INTO public.fipe_prices (fipe_code, brand, model, year, fuel_type, price, reference_month) VALUES
('001004-1', 'Chevrolet', 'Onix', 2023, 'Gasolina', 65000.00, 'outubro/2025'),
('001072-2', 'Fiat', 'Argo', 2022, 'Gasolina', 55000.00, 'outubro/2025'),
('002027-0', 'Honda', 'Civic', 2020, 'Gasolina', 95000.00, 'outubro/2025'),
('005050-0', 'Volkswagen', 'Gol', 2020, 'Gasolina', 42000.00, 'outubro/2025'),
('007021-9', 'Toyota', 'Corolla', 2022, 'Gasolina', 105000.00, 'outubro/2025'),
('008047-8', 'Jeep', 'Renegade', 2021, 'Gasolina', 88000.00, 'outubro/2025'),
('003015-4', 'Hyundai', 'HB20', 2023, 'Gasolina', 58000.00, 'outubro/2025'),
('006033-3', 'Renault', 'Kwid', 2022, 'Gasolina', 45000.00, 'outubro/2025'),
('004061-2', 'Ford', 'Ranger', 2020, 'Diesel', 165000.00, 'outubro/2025'),
('009028-5', 'Nissan', 'Kicks', 2022, 'Gasolina', 82000.00, 'outubro/2025')
ON CONFLICT (fipe_code) DO NOTHING;


-- ============================================
-- 6. LOG DE SCRAPING DE EXEMPLO
-- ============================================

DO $$
DECLARE
    auctioneer_rec RECORD;
BEGIN
    FOR auctioneer_rec IN SELECT id FROM public.auctioneers LIMIT 3 LOOP
        INSERT INTO public.scraping_logs (
            auctioneer_id,
            status,
            vehicles_scraped,
            vehicles_created,
            vehicles_updated,
            execution_time_ms,
            started_at,
            completed_at
        ) VALUES
        (
            auctioneer_rec.id,
            'success',
            150,
            45,
            105,
            45000,
            NOW() - INTERVAL '2 hours',
            NOW() - INTERVAL '1 hour 15 minutes'
        ),
        (
            auctioneer_rec.id,
            'success',
            142,
            38,
            104,
            42000,
            NOW() - INTERVAL '14 hours',
            NOW() - INTERVAL '13 hours 10 minutes'
        );
    END LOOP;
END $$;


-- ============================================
-- INFORMAÇÕES ÚTEIS
-- ============================================

-- Verificar dados inseridos
SELECT 'Auctioneers' as table_name, COUNT(*) as count FROM public.auctioneers
UNION ALL
SELECT 'Vehicles', COUNT(*) FROM public.vehicles
UNION ALL
SELECT 'Vehicle Images', COUNT(*) FROM public.vehicle_images
UNION ALL
SELECT 'FIPE Prices', COUNT(*) FROM public.fipe_prices
UNION ALL
SELECT 'Scraping Logs', COUNT(*) FROM public.scraping_logs
UNION ALL
SELECT 'Plans', COUNT(*) FROM public.plans;

