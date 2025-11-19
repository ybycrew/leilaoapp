# Mapeamento de Colunas - Schema Real vs Schema.sql

Este documento mapeia as diferenças entre o schema.sql (desatualizado) e o schema real do banco Supabase.

## ⚠️ IMPORTANTE

O `supabase/schema.sql` está **DESATUALIZADO** e não reflete o schema real do banco.

## Tabela: `vehicles`

### ✅ Colunas que EXISTEM no banco real:

| Nome Real (Inglês) | Tipo | Obrigatória | Existe em schema.sql? |
|-------------------|------|-------------|----------------------|
| `id` | UUID | ✅ SIM | ✅ SIM |
| `title` | TEXT | ✅ SIM | ❌ (tem `titulo`) |
| `description` | TEXT | ❌ NÃO | ❌ (tem `descricao`) |
| `brand` | TEXT | ✅ SIM | ❌ (tem `marca`) |
| `model` | TEXT | ✅ SIM | ❌ (tem `modelo`) |
| `version` | TEXT | ❌ NÃO | ❌ NÃO |
| `year_model` | INTEGER | ❌ NÃO | ❌ (tem `ano_modelo`) |
| `year_manufacture` | INTEGER | ❌ NÃO | ❌ (tem `ano`) |
| `vehicle_type` | TEXT | ❌ NÃO | ❌ (tem `tipo_veiculo`) |
| `color` | TEXT | ❌ NÃO | ❌ (tem `cor`) |
| `fuel_type` | TEXT | ❌ NÃO | ❌ (tem `combustivel`) |
| `transmission` | TEXT | ❌ NÃO | ❌ (tem `cambio`) |
| `mileage` | INTEGER | ❌ NÃO | ❌ (tem `km`) |
| `license_plate` | TEXT | ❌ NÃO | ❌ NÃO |
| `state` | TEXT | ✅ SIM | ❌ (tem `estado`) |
| `city` | TEXT | ✅ SIM | ❌ (tem `cidade`) |
| `current_bid` | DECIMAL | ❌ NÃO | ❌ (tem `preco_atual`) |
| `minimum_bid` | DECIMAL | ❌ NÃO | ❌ (tem `preco_inicial`) |
| `appraised_value` | DECIMAL | ❌ NÃO | ❌ NÃO |
| `auction_type` | TEXT | ❌ NÃO | ❌ (tem `tipo_leilao`) |
| `auction_status` | TEXT | ❌ NÃO | ❌ NÃO |
| `auction_date` | TIMESTAMP | ❌ NÃO | ❌ (tem `data_leilao`) |
| `has_financing` | BOOLEAN | ❌ NÃO | ❌ NÃO |
| `accepts_financing` | BOOLEAN | ❌ NÃO | ❌ (tem `aceita_financiamento`) |
| `aceita_financiamento` | BOOLEAN | ❌ NÃO | ✅ SIM (legado) |
| `fipe_price` | DECIMAL | ❌ NÃO | ❌ (tem `fipe_preco`) |
| `fipe_code` | TEXT | ❌ NÃO | ❌ (tem `fipe_codigo`) |
| `fipe_discount_percentage` | DECIMAL | ❌ NÃO | ❌ NÃO |
| `deal_score` | INTEGER | ❌ NÃO | ✅ SIM |
| `original_url` | TEXT | ✅ SIM | ❌ NÃO |
| `thumbnail_url` | TEXT | ❌ NÃO | ❌ NÃO |
| `auctioneer_id` | UUID | ✅ SIM | ❌ NÃO |
| `external_id` | TEXT | ❌ NÃO | ❌ NÃO |
| `lot_number` | TEXT | ❌ NÃO | ❌ NÃO |
| `is_active` | BOOLEAN | ❌ NÃO | ❌ NÃO |
| `views_count` | INTEGER | ❌ NÃO | ❌ NÃO |
| `favorites_count` | INTEGER | ❌ NÃO | ❌ NÃO |
| `scraped_at` | TIMESTAMP | ❌ NÃO | ❌ NÃO |
| `condition` | TEXT | ❌ NÃO | ❌ NÃO |
| `leiloeiro` | TEXT | ❌ NÃO | ✅ SIM (legado, nullable) |
| `leiloeiro_url` | ❌ NÃO EXISTE | - | ✅ SIM (schema.sql) |
| `created_at` | TIMESTAMP | ❌ NÃO | ✅ SIM |
| `updated_at` | TIMESTAMP | ❌ NÃO | ✅ SIM |

### ❌ Colunas que NÃO EXISTEM no banco real (presentes apenas no schema.sql):

- `tipo_veiculo` → usar `vehicle_type`
- `marca` → usar `brand`
- `modelo` → usar `model`
- `titulo` → usar `title`
- `descricao` → usar `description`
- `ano` → usar `year_model` ou `year_manufacture`
- `ano_modelo` → usar `year_model`
- `cor` → usar `color`
- `combustivel` → usar `fuel_type`
- `cambio` → usar `transmission`
- `km` → usar `mileage`
- `estado` → usar `state`
- `cidade` → usar `city`
- `preco_inicial` → usar `minimum_bid`
- `preco_atual` → usar `current_bid`
- `tipo_leilao` → usar `auction_type`
- `data_leilao` → usar `auction_date`
- `fipe_preco` → usar `fipe_price`
- `fipe_codigo` → usar `fipe_code`
- `leiloeiro_url` → usar `auctioneer_id` + join com `auctioneers`
- `imagens` → usar `images` (se existir) ou campo separado

## 🎯 Regra Geral

**SEMPRE usar nomes em INGLÊS** ao trabalhar com a tabela `vehicles`. As colunas em português (`tipo_veiculo`, `marca`, `modelo`, etc.) **NÃO EXISTEM** no banco real.

## 📋 Checklist para Atualização do Código

- [ ] Remover todas as referências a `tipo_veiculo` → usar `vehicle_type`
- [ ] Remover todas as referências a `marca` → usar `brand`
- [ ] Remover todas as referências a `modelo` → usar `model`
- [ ] Remover todas as referências a `titulo` → usar `title`
- [ ] Remover todas as referências a `descricao` → usar `description`
- [ ] Remover todas as referências a `ano` → usar `year_model` ou `year_manufacture`
- [ ] Remover todas as referências a `ano_modelo` → usar `year_model`
- [ ] Remover todas as referências a `cor` → usar `color`
- [ ] Remover todas as referências a `combustivel` → usar `fuel_type`
- [ ] Remover todas as referências a `cambio` → usar `transmission`
- [ ] Remover todas as referências a `km` → usar `mileage`
- [ ] Remover todas as referências a `estado` → usar `state`
- [ ] Remover todas as referências a `cidade` → usar `city`
- [ ] Remover todas as referências a `preco_inicial` → usar `minimum_bid`
- [ ] Remover todas as referências a `preco_atual` → usar `current_bid`
- [ ] Remover todas as referências a `tipo_leilao` → usar `auction_type`
- [ ] Remover todas as referências a `data_leilao` → usar `auction_date`
- [ ] Remover todas as referências a `fipe_preco` → usar `fipe_price`
- [ ] Remover todas as referências a `fipe_codigo` → usar `fipe_code`
- [ ] Remover todas as referências a `leiloeiro_url` → usar `auctioneer_id`

## 🔍 Como Validar

1. Gerar tipos novamente: `npm run generate-types:linked` ou `npm run generate-types`
2. Verificar `src/types/database.types.ts` para ver colunas reais
3. Usar TypeScript para detectar erros de colunas inexistentes

