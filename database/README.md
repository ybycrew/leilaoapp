# 📦 Database SQL - YbyBid

Este diretório contém todos os arquivos SQL necessários para configurar e operar o banco de dados do projeto YbyBid.

## 📁 Estrutura de Arquivos

```
database/
├── schema.sql          # Schema completo do banco de dados
├── queries.sql         # Funções e queries úteis para as APIs
├── seeds.sql           # Dados iniciais para desenvolvimento
├── indexes.sql         # Índices adicionais para otimização
└── README.md          # Este arquivo
```

## 🚀 Como Usar

### 1. Setup Inicial no Supabase

#### Opção A: Via Dashboard do Supabase

1. Acesse o Dashboard do Supabase
2. Vá em **SQL Editor**
3. Crie uma nova query
4. Copie e cole o conteúdo de `schema.sql`
5. Execute a query
6. Repita o processo para `queries.sql` e `seeds.sql`

#### Opção B: Via CLI do Supabase

```bash
# Instalar CLI do Supabase
npm install -g supabase

# Login
supabase login

# Link com seu projeto
supabase link --project-ref seu-project-ref

# Executar schema
supabase db push

# Ou executar arquivos específicos
psql -h db.seu-projeto.supabase.co -p 5432 -d postgres -U postgres -f database/schema.sql
```

### 2. Ordem de Execução

**IMPORTANTE:** Execute os arquivos nesta ordem:

```sql
1. schema.sql    -- Cria todas as tabelas, triggers, funções e RLS
2. seeds.sql     -- Popula com dados iniciais (desenvolvimento)
3. queries.sql   -- Adiciona funções auxiliares para as APIs
```

### 3. Ambiente de Desenvolvimento vs Produção

#### Desenvolvimento
```sql
-- Executar todos os arquivos incluindo seeds
psql ... -f database/schema.sql
psql ... -f database/queries.sql
psql ... -f database/seeds.sql
```

#### Produção
```sql
-- NÃO executar seeds.sql em produção
psql ... -f database/schema.sql
psql ... -f database/queries.sql
```

## 📊 Estrutura do Banco de Dados

### Tabelas Principais

| Tabela | Descrição | Linhas Estimadas |
|--------|-----------|------------------|
| `profiles` | Perfis de usuários | 10K+ |
| `vehicles` | Catálogo de veículos | 100K+ |
| `auctioneers` | Leiloeiros cadastrados | 50-100 |
| `favorites` | Veículos favoritos | 50K+ |
| `subscriptions` | Assinaturas ativas | 1K+ |
| `search_history` | Histórico de buscas | 500K+ |
| `vehicle_images` | Imagens dos veículos | 500K+ |
| `fipe_prices` | Cache de preços FIPE | 50K+ |

### Relacionamentos

```
profiles (1) -----> (N) favorites
profiles (1) -----> (N) subscriptions
profiles (1) -----> (N) search_history
profiles (1) -----> (N) saved_filters

vehicles (1) -----> (N) vehicle_images
vehicles (N) -----> (1) auctioneers
vehicles (N) -----> (N) favorites

auctioneers (1) -----> (N) scraping_logs
```

## 🔍 Queries Principais

### Buscar Veículos com Filtros

```sql
SELECT * FROM search_vehicles(
    p_search_text := 'civic',
    p_states := ARRAY['SP', 'RJ'],
    p_min_year := 2020,
    p_max_price := 100000,
    p_order_by := 'deal_score',
    p_limit := 20
);
```

### Verificar se Usuário Pode Buscar

```sql
SELECT * FROM can_user_search('user-uuid-aqui');
```

### Obter Detalhes Completos de um Veículo

```sql
SELECT * FROM get_vehicle_details('vehicle-uuid-aqui');
```

### Estatísticas do Dashboard

```sql
SELECT * FROM get_dashboard_stats();
```

### Filtros Disponíveis

```sql
SELECT * FROM get_available_filters();
```

## 🔐 Row Level Security (RLS)

O banco utiliza RLS para garantir segurança dos dados:

### Políticas Aplicadas

- ✅ Usuários só veem seus próprios: favoritos, histórico, filtros salvos, alertas
- ✅ Veículos, leiloeiros e preços FIPE são públicos (leitura)
- ✅ Apenas usuários autenticados podem acessar dados
- ✅ Assinaturas são privadas por usuário

### Testando RLS

```sql
-- Verificar políticas de uma tabela
SELECT * FROM pg_policies WHERE tablename = 'favorites';

-- Testar como usuário específico
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid';
SELECT * FROM favorites; -- Verá apenas seus favoritos
RESET ROLE;
```

## 📈 Performance e Índices

### Índices Criados

O schema cria automaticamente índices para:

- ✅ Buscas por marca, modelo, tipo
- ✅ Filtros por estado, cidade, ano
- ✅ Ordenação por preço, score, data
- ✅ Busca textual (full-text search)
- ✅ Foreign keys (relacionamentos)

### Monitorar Performance

```sql
-- Queries mais lentas
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Tabelas maiores
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Índices não utilizados
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelname NOT LIKE 'pg_toast%';
```

## 🧹 Manutenção

### Limpar Veículos Antigos

```sql
-- Desativa veículos com leilão há mais de 30 dias
SELECT cleanup_old_vehicles();
```

### Atualizar Estatísticas

```sql
-- Atualizar estatísticas do PostgreSQL
ANALYZE;

-- Vacuum completo (fazer em horário de baixo uso)
VACUUM FULL;
```

### Backup

```bash
# Backup completo
pg_dump -h db.seu-projeto.supabase.co -U postgres -d postgres > backup.sql

# Backup apenas schema
pg_dump -h db.seu-projeto.supabase.co -U postgres -d postgres --schema-only > schema_backup.sql

# Backup apenas dados
pg_dump -h db.seu-projeto.supabase.co -U postgres -d postgres --data-only > data_backup.sql
```

## 🔄 Migrations Futuras

Para adicionar mudanças no banco em produção:

### 1. Criar Migration

```sql
-- migration_001_add_vehicle_condition.sql
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS vehicle_condition TEXT;

CREATE INDEX IF NOT EXISTS idx_vehicles_condition 
ON public.vehicles(vehicle_condition);
```

### 2. Testar em Desenvolvimento

```bash
psql ... -f migrations/migration_001_add_vehicle_condition.sql
```

### 3. Aplicar em Produção

```bash
# Via Supabase CLI
supabase db push
```

## 📝 Convenções

### Nomenclatura

- **Tabelas**: plural, snake_case (`vehicles`, `search_history`)
- **Colunas**: snake_case (`created_at`, `deal_score`)
- **Funções**: snake_case com verbo (`get_vehicle_details`, `can_user_search`)
- **Índices**: `idx_table_column` (`idx_vehicles_brand`)

### Tipos de Dados

- **IDs**: UUID (gerado com `uuid_generate_v4()`)
- **Timestamps**: `TIMESTAMP WITH TIME ZONE`
- **Dinheiro**: `DECIMAL(10, 2)`
- **Booleanos**: `BOOLEAN` (não NULL)
- **JSON**: `JSONB` (indexável)

### Valores Padrão

- `created_at`: `NOW()`
- `updated_at`: `NOW()` (atualizado por trigger)
- `is_active`: `true`
- Contadores: `0`

## 🐛 Troubleshooting

### Erro: "relation already exists"

```sql
-- Limpar todas as tabelas (CUIDADO!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### Erro: "permission denied"

```sql
-- Verificar permissões
SELECT * FROM information_schema.role_table_grants 
WHERE grantee = 'seu_usuario';

-- Conceder permissões
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO seu_usuario;
```

### RLS impedindo acesso

```sql
-- Desabilitar temporariamente (desenvolvimento)
ALTER TABLE tabela DISABLE ROW LEVEL SECURITY;

-- Reabilitar
ALTER TABLE tabela ENABLE ROW LEVEL SECURITY;
```

### Função não encontrada

```sql
-- Verificar funções existentes
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public';

-- Recriar função
DROP FUNCTION IF EXISTS nome_funcao;
-- Executar CREATE FUNCTION novamente
```

## 📚 Recursos Adicionais

- [Documentação Supabase](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## 🤝 Contribuindo

Ao adicionar novas tabelas ou modificações:

1. Atualizar `schema.sql`
2. Adicionar queries em `queries.sql` se necessário
3. Atualizar seeds em `seeds.sql` para dados de teste
4. Documentar neste README
5. Criar migration separada para produção

## ❓ Dúvidas

Para dúvidas sobre o banco de dados:
- Consulte este README
- Veja a documentação inline nos arquivos SQL
- Analise os comentários em cada tabela/função

