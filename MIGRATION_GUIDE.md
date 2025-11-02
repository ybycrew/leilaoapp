# Guia de Migration - Correção de Mapeamento de Campos

## 📋 Resumo das Alterações

Corrigido o mapeamento de campos no scraper para usar os nomes corretos em português conforme o schema do Supabase.

## 🔧 Alterações Implementadas

### 1. Migration SQL (`supabase/migrations/001_add_vehicle_fields.sql`)
- ✅ Adicionado campo `external_id` na tabela `vehicles`
- ✅ Criado índice para busca rápida por `external_id`
- ✅ Verificação condicional: cria índices usando `leiloeiro` apenas se a coluna existir
- ✅ Fallback: se `leiloeiro` não existir, usa apenas `external_id` para evitar duplicatas
- ✅ Adicionado índice para melhorar busca por `modelo` (se existir)

**⚠️ IMPORTANTE:** 
1. Primeiro execute `001_check_table_structure.sql` para ver quais colunas existem
2. Depois execute `001_add_vehicle_fields.sql` no Supabase SQL Editor
3. A migration é segura e verifica a estrutura antes de criar índices

### 2. Correção do Scraper (`src/lib/scraping/index.ts`)

#### Mapeamento de Campos (Inglês → Português):
- ✅ `brand` → `marca`
- ✅ `model` → `modelo`
- ✅ `fuel_type` → `combustivel`
- ✅ `transmission` → `cambio`
- ✅ `color` → `cor`
- ✅ `mileage` → `km`
- ✅ `current_bid` → `preco_atual`
- ✅ `minimum_bid` → `preco_inicial`
- ✅ `auction_type` → `tipo_leilao` (normalizado para valores aceitos)
- ✅ `vehicle_type` → `tipo_veiculo` (normalizado para valores aceitos)
- ✅ `has_financing` → `aceita_financiamento`

#### Melhorias Implementadas:
1. **UPSERT inteligente**: Verifica se veículo existe usando `leiloeiro + external_id` antes de inserir/atualizar
2. **Normalização de tipos**: Funções para normalizar `tipo_leilao` e `tipo_veiculo` para valores aceitos pelo schema
3. **Tratamento de erros**: Captura erros ao salvar imagens separadamente sem quebrar o processo
4. **Rastreamento correto**: Retorna se foi criação ou atualização corretamente

## 📝 Como Aplicar

### Passo 1: Executar Migration no Supabase

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Execute o conteúdo de `supabase/migrations/001_add_vehicle_fields.sql`:

```sql
-- Copie e cole o conteúdo do arquivo aqui e execute
```

### Passo 2: Verificar Filtros

Os filtros já estão corretos! A função `getFilterOptions()` em `src/app/buscar/actions.ts` já usa:
- `marca` (não `brand`)
- `modelo` (não `model`)
- `combustivel` (não `fuel_type`)
- `cambio` (não `transmission`)
- `cor` (não `color`)

### Passo 3: Testar Scraping

Após executar a migration, execute o scraping:

```bash
# No servidor/VPS
cd /opt/leilaoapp
npm run scrape  # ou como você executa o scraping
```

## ✅ Benefícios

1. **Dados corretos no banco**: Campos salvos com nomes corretos em português
2. **Filtros funcionando**: Agora os filtros vão encontrar os dados corretos
3. **Sem duplicatas**: UPSERT baseado em `leiloeiro + external_id` evita veículos duplicados
4. **Manutenibilidade**: Código alinhado com o schema do banco

## 🔍 Validação

Após executar o scraping, verifique no Supabase:

```sql
-- Verificar se os dados estão sendo salvos corretamente
SELECT 
  leiloeiro,
  marca,
  modelo,
  combustivel,
  cambio,
  cor,
  km,
  external_id
FROM vehicles
WHERE marca IS NOT NULL
LIMIT 10;
```

Os campos devem estar populados com os dados corretos!

