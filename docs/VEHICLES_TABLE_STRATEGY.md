# Estratégia de Uso: vehicles vs vehicles_with_auctioneer

## Visão Geral

O projeto usa duas estruturas relacionadas:

1. **Tabela `vehicles`** - Tabela base onde os dados são armazenados
2. **View `vehicles_with_auctioneer`** - View que une vehicles com auctioneers e filtra apenas ativos

## Regra de Uso

### ✅ USE `vehicles_with_auctioneer` PARA:
- ✅ **Todas as consultas de LEITURA** (SELECT)
- ✅ **Busca e filtros** (getFilterOptions, searchVehicles)
- ✅ **Listagem de veículos** (getVehicleStats, listagem na página)
- ✅ **Busca de sugestões** (searchSuggestions)
- ✅ **APIs públicas** (GET /api/vehicles)

### ❌ USE `vehicles` APENAS PARA:
- ❌ **Inserção de dados** (INSERT - scraping)
- ❌ **Atualização de dados** (UPDATE - scraping)
- ❌ **Scripts de migração/normalização**
- ❌ **Arquivos de debug** (debug-actions.ts, etc.)

## Por que usar a view?

1. **Dados sempre atualizados**: A view sempre retorna dados da tabela base
2. **Informações enriquecidas**: Inclui dados do leiloeiro automaticamente
3. **Filtro automático**: Retorna apenas veículos ativos
4. **Performance**: Pode usar índices da tabela base

## Estrutura da View

```sql
CREATE VIEW public.vehicles_with_auctioneer AS
SELECT 
    v.*,
    a.name as auctioneer_name,
    a.slug as auctioneer_slug,
    a.logo_url as auctioneer_logo
FROM public.vehicles v
INNER JOIN public.auctioneers a ON v.auctioneer_id = a.id
WHERE v.is_active = true;
```

## Exemplo de Uso Correto

### ✅ Correto - Usar a view para leitura:
```typescript
const { data } = await supabase
  .from('vehicles_with_auctioneer')
  .select('*')
  .eq('state', 'SP');
```

### ❌ Incorreto - Não usar a tabela diretamente para leitura:
```typescript
// NÃO FAZER ISSO para consultas de leitura
const { data } = await supabase
  .from('vehicles')
  .select('*')
  .eq('state', 'SP');
```

## Migração

Se encontrar código usando `vehicles` diretamente para leitura, atualize para usar `vehicles_with_auctioneer`.

## Troubleshooting

**Problema**: Os filtros mostram apenas alguns estados/registros

**Solução**: 
1. Verifique se está usando `vehicles_with_auctioneer` e não `vehicles`
2. Execute a migration `011_ensure_vehicles_view_correct.sql` para recriar a view
3. Limpe o cache do Redis se estiver usando

