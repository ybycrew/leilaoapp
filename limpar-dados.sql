-- Limpar todos os veículos do Sodré Santoro
DELETE FROM public.vehicles 
WHERE auctioneer_id IN (
  SELECT id FROM public.auctioneers WHERE slug = 'sodre-santoro'
);

-- Verificar quantos ficaram
SELECT COUNT(*) as total_vehicles FROM public.vehicles;


