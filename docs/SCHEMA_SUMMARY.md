# Resumo do Schema Real do Supabase

## ✅ Tipos Gerados com Sucesso!

Os tipos TypeScript foram gerados com sucesso em `src/types/database.types.ts` usando Supabase CLI.

## 🎯 Principais Descobertas

### 1. Tabela `vehicles` usa principalmente nomes em INGLÊS

**⚠️ IMPORTANTE:** A tabela `vehicles` usa nomes em **inglês**, não português!

### 2. Colunas Reais da Tabela `vehicles`

#### ✅ Campos Obrigatórios (NOT NULL):
- `id` (UUID, PK)
- `title` (TEXT)
- `brand` (TEXT)
- `model` (TEXT)
- `state` (TEXT)
- `city` (TEXT)
- `original_url` (TEXT)
- `auctioneer_id` (UUID, FK)

#### ✅ Campos em Inglês (principais):
- `vehicle_type` ⚠️ **ESTA É A COLUNA CORRETA** (não `tipo_veiculo`)
- `title`, `description`
- `brand`, `model`, `version`
- `year_model`, `year_manufacture`
- `color`, `fuel_type`, `transmission`
- `mileage`, `license_plate`
- `state`, `city`
- `current_bid`, `minimum_bid`, `appraised_value`
- `auction_type`, `auction_status`, `auction_date`
- `has_financing`, `accepts_financing`
- `fipe_price`, `fipe_code`, `fipe_discount_percentage`
- `deal_score`
- `original_url`, `thumbnail_url`
- `external_id`, `lot_number`
- `is_active`, `views_count`, `favorites_count`
- `scraped_at`, `condition`
- `created_at`, `updated_at`

#### ⚠️ Campos Legados em Português (nullable, não usar):
- `leiloeiro` (TEXT, nullable) → usar `auctioneer_id` + join
- `aceita_financiamento` (BOOLEAN, nullable) → usar `accepts_financing` ou `has_financing`

### 3. ❌ Colunas que NÃO EXISTEM (presentes apenas no schema.sql antigo)

Todas as colunas em português do `schema.sql` **NÃO EXISTEM** no banco real:
- ❌ `tipo_veiculo` → usar `vehicle_type`
- ❌ `marca` → usar `brand`
- ❌ `modelo` → usar `model`
- ❌ `titulo` → usar `title`
- ❌ `descricao` → usar `description`
- ❌ `ano`, `ano_modelo` → usar `year_model` ou `year_manufacture`
- ❌ `cor` → usar `color`
- ❌ `combustivel` → usar `fuel_type`
- ❌ `cambio` → usar `transmission`
- ❌ `km` → usar `mileage`
- ❌ `estado` → usar `state`
- ❌ `cidade` → usar `city`
- ❌ `preco_inicial`, `preco_atual` → usar `minimum_bid`, `current_bid`
- ❌ `tipo_leilao` → usar `auction_type`
- ❌ `data_leilao` → usar `auction_date`
- ❌ `fipe_preco`, `fipe_codigo` → usar `fipe_price`, `fipe_code`
- ❌ `leiloeiro_url` → usar `auctioneer_id` + join
- ❌ `imagens` → usar campo separado se necessário

### 4. View `vehicles_with_auctioneer`

View que une `vehicles` com `auctioneers`, retornando:
- Todos os campos de `vehicles`
- `auctioneer_id`, `auctioneer_name`, `auctioneer_slug`, `auctioneer_logo`

### 5. Outras Tabelas

- `auctioneers` - Leiloeiros
- `fipe_vehicle_types`, `fipe_brands`, `fipe_models`, `fipe_model_years`, `fipe_price_references` - Tabelas FIPE
- `profiles`, `saved_filters`, `alerts` - Dados de usuários
- `users_with_subscription` (view) - Usuários com assinaturas

## 📋 Próximos Passos

1. ✅ Tipos gerados em `src/types/database.types.ts`
2. ✅ Documentação do schema real criada
3. ⏳ Criar helpers para trabalhar com tipos gerados
4. ⏳ Atualizar código de scraping para usar apenas colunas em inglês
5. ⏳ Remover código de compatibilidade com colunas em português
6. ⏳ Atualizar `vehicle-table-info.ts` para usar tipos gerados

## 🔍 Como Regenerar Tipos

```bash
# Se linkou o projeto:
npm run generate-types:linked

# Se usar Project ID diretamente:
export SUPABASE_PROJECT_ID="seu-project-id"
npm run generate-types
```

