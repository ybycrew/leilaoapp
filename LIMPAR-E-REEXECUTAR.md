# 🔧 Correção Aplicada: Seletor de Imagens

## O que foi corrigido:
- ❌ **Antes**: Buscava `img.block.w-full.h-full` (seletor errado)
- ✅ **Agora**: Percorre todas as imagens e pega a primeira com `src` válido

## Próximos Passos:

### 1️⃣ Limpar dados antigos no Supabase
Execute no SQL Editor:
```sql
DELETE FROM public.vehicles 
WHERE auctioneer_id IN (
  SELECT id FROM public.auctioneers WHERE slug = 'sodre-santoro'
);

-- Verificar
SELECT COUNT(*) FROM public.vehicles;
```

### 2️⃣ Reiniciar servidor Next.js
No terminal, pressione `Ctrl+C` e rode:
```bash
npm run dev
```

### 3️⃣ Rodar scraping (em outro terminal)
```bash
curl "http://localhost:3000/api/cron/scrape?secret=abc123"
```

### 4️⃣ Verificar resultado
Execute no SQL Editor:
```sql
SELECT 
    title,
    thumbnail_url,  -- Deve ter URL agora!
    current_bid,
    mileage,
    auction_date,
    year_model
FROM vehicles
WHERE brand = 'Chevrolet'
LIMIT 10;
```

Agora as imagens devem aparecer! 📸


