# Schema Real do Banco Supabase

Este documento descreve o schema **real** do banco de dados Supabase, gerado automaticamente pelo Supabase CLI em `src/types/database.types.ts`.

## Tabela: `vehicles`

### Colunas Existentes

#### Campos em Inglês (principais):
- `id` (UUID, PK)
- `title` (TEXT, NOT NULL)
- `description` (TEXT, nullable)
- `brand` (TEXT, NOT NULL)
- `model` (TEXT, NOT NULL)
- `version` (TEXT, nullable)
- `year_model` (INTEGER, nullable)
- `year_manufacture` (INTEGER, nullable)
- `vehicle_type` (TEXT, nullable) ⚠️ **ESTA É A COLUNA CORRETA**
- `color` (TEXT, nullable)
- `fuel_type` (TEXT, nullable)
- `transmission` (TEXT, nullable)
- `mileage` (INTEGER, nullable)
- `license_plate` (TEXT, nullable)
- `state` (TEXT, NOT NULL)
- `city` (TEXT, NOT NULL)
- `current_bid` (DECIMAL, nullable)
- `minimum_bid` (DECIMAL, nullable)
- `appraised_value` (DECIMAL, nullable)
- `auction_type` (TEXT, nullable)
- `auction_status` (TEXT, nullable)
- `auction_date` (TIMESTAMP, nullable)
- `has_financing` (BOOLEAN, nullable)
- `accepts_financing` (BOOLEAN, nullable)
- `fipe_price` (DECIMAL, nullable)
- `fipe_code` (TEXT, nullable)
- `fipe_discount_percentage` (DECIMAL, nullable)
- `deal_score` (INTEGER, nullable)
- `original_url` (TEXT, NOT NULL)
- `thumbnail_url` (TEXT, nullable)
- `auctioneer_id` (UUID, NOT NULL, FK para auctioneers)
- `external_id` (TEXT, nullable)
- `lot_number` (TEXT, nullable)
- `is_active` (BOOLEAN, nullable)
- `views_count` (INTEGER, nullable)
- `favorites_count` (INTEGER, nullable)
- `scraped_at` (TIMESTAMP, nullable)
- `condition` (TEXT, nullable)
- `created_at` (TIMESTAMP, nullable)
- `updated_at` (TIMESTAMP, nullable)

#### Campos em Português (legados, nullable):
- `leiloeiro` (TEXT, nullable)
- `aceita_financiamento` (BOOLEAN, nullable)

### Colunas NÃO Existentes (presentes no schema.sql antigo):
- ❌ `tipo_veiculo` - **NÃO EXISTE**, usar `vehicle_type`
- ❌ `marca` - **NÃO EXISTE**, usar `brand`
- ❌ `modelo` - **NÃO EXISTE**, usar `model`
- ❌ `titulo` - **NÃO EXISTE**, usar `title`
- ❌ `descricao` - **NÃO EXISTE**, usar `description`
- ❌ `ano` - **NÃO EXISTE**, usar `year_model` ou `year_manufacture`
- ❌ `ano_modelo` - **NÃO EXISTE**, usar `year_model`
- ❌ `cor` - **NÃO EXISTE**, usar `color`
- ❌ `combustivel` - **NÃO EXISTE**, usar `fuel_type`
- ❌ `cambio` - **NÃO EXISTE**, usar `transmission`
- ❌ `km` - **NÃO EXISTE**, usar `mileage`
- ❌ `estado` - **NÃO EXISTE**, usar `state`
- ❌ `cidade` - **NÃO EXISTE**, usar `city`
- ❌ `preco_inicial` - **NÃO EXISTE**, usar `minimum_bid`
- ❌ `preco_atual` - **NÃO EXISTE**, usar `current_bid`
- ❌ `tipo_leilao` - **NÃO EXISTE**, usar `auction_type`
- ❌ `data_leilao` - **NÃO EXISTE**, usar `auction_date`
- ❌ `fipe_preco` - **NÃO EXISTE**, usar `fipe_price`
- ❌ `fipe_codigo` - **NÃO EXISTE**, usar `fipe_code`
- ❌ `imagens` - **NÃO EXISTE** (usar `images` se existir, ou campo separado)

### Campos Obrigatórios (NOT NULL):
- `id` (UUID, PK)
- `title` (TEXT)
- `brand` (TEXT)
- `model` (TEXT)
- `state` (TEXT)
- `city` (TEXT)
- `original_url` (TEXT)
- `auctioneer_id` (UUID, FK)

## View: `vehicles_with_auctioneer`

View que une `vehicles` com `auctioneers`, retornando campos de ambas as tabelas.

### Campos Principais:
- Todos os campos de `vehicles` (nullable na view)
- `auctioneer_id` (UUID, nullable)
- `auctioneer_name` (TEXT, nullable)
- `auctioneer_slug` (TEXT, nullable)
- `auctioneer_logo` (TEXT, nullable)

## Tabelas Relacionadas

### `auctioneers`
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL)
- `slug` (TEXT, NOT NULL)
- `website_url` (TEXT, NOT NULL)
- `description` (TEXT, nullable)
- `logo_url` (TEXT, nullable)
- `is_active` (BOOLEAN, nullable)
- `scrape_frequency_hours` (INTEGER, nullable)
- `last_scrape_at` (TIMESTAMP, nullable)
- `scraping_config` (JSONB, nullable)
- `created_at` (TIMESTAMP, nullable)
- `updated_at` (TIMESTAMP, nullable)

### Tabelas FIPE
- `fipe_vehicle_types`
- `fipe_brands`
- `fipe_models`
- `fipe_model_years`
- `fipe_price_references`

### Outras Tabelas
- `profiles`
- `saved_filters`
- `alerts`
- `user_favorites` (ou similar)
- `user_searches` (ou similar)
- `subscriptions`

## Mapeamento de Colunas (Português → Inglês)

| Português (NÃO existe) | Inglês (CORRETO) |
|------------------------|------------------|
| `tipo_veiculo` | `vehicle_type` ✅ |
| `marca` | `brand` ✅ |
| `modelo` | `model` ✅ |
| `titulo` | `title` ✅ |
| `descricao` | `description` ✅ |
| `ano` | `year_model` ou `year_manufacture` ✅ |
| `ano_modelo` | `year_model` ✅ |
| `cor` | `color` ✅ |
| `combustivel` | `fuel_type` ✅ |
| `cambio` | `transmission` ✅ |
| `km` | `mileage` ✅ |
| `estado` | `state` ✅ |
| `cidade` | `city` ✅ |
| `preco_inicial` | `minimum_bid` ✅ |
| `preco_atual` | `current_bid` ✅ |
| `tipo_leilao` | `auction_type` ✅ |
| `data_leilao` | `auction_date` ✅ |
| `fipe_preco` | `fipe_price` ✅ |
| `fipe_codigo` | `fipe_code` ✅ |
| `aceita_financiamento` | `accepts_financing` ou `has_financing` ✅ |

## Observações Importantes

1. **A coluna de tipo de veículo é `vehicle_type` (inglês), NÃO `tipo_veiculo`**
2. **A tabela usa principalmente nomes em inglês**, não português
3. **O campo `leiloeiro` existe mas é nullable e legado** - usar `auctioneer_id` + join com `auctioneers`
4. **Não há campos em português para a maioria das colunas** - o schema.sql está desatualizado
5. **A view `vehicles_with_auctioneer` é a principal** usada nas APIs de busca

## Próximos Passos

1. ✅ Tipos TypeScript gerados em `src/types/database.types.ts`
2. Atualizar código de scraping para usar apenas colunas em inglês
3. Remover código de compatibilidade com colunas em português
4. Atualizar `vehicle-table-info.ts` para usar tipos gerados
5. Documentar todas as tabelas e suas relações

