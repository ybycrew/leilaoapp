-- Script para limpar veículos antigos e preparar para novo scraping
-- Execute no SQL Editor do Supabase

-- 1. Deletar todos os veículos existentes
DELETE FROM public.vehicles WHERE auctioneer_id IN (
  SELECT id FROM public.auctioneers WHERE slug = 'sodre-santoro'
);

-- 2. Verificar se deletou
SELECT COUNT(*) as total_vehicles_remaining FROM public.vehicles;

-- Pronto! Agora você pode rodar o scraper novamente
-- Execute: npm run scrape OU http://localhost:3000/api/cron/scrape?secret=abc123


