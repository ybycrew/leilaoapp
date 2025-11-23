# ⚡ Quick Start - YbyBid Database

## 🎯 Setup em 3 Minutos

### Passo 1: Execute o Schema Principal (2 min)

**Via Dashboard do Supabase:**

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **SQL Editor** (ícone de banco de dados)
4. Clique em **New Query**
5. Copie todo o conteúdo de `database/schema.sql`
6. Cole no editor
7. Clique em **Run** (ou F5)
8. ✅ Aguarde ~30 segundos até completar

**Via Terminal:**

```bash
psql postgresql://postgres:[SUA-SENHA]@db.[SEU-PROJETO].supabase.co:5432/postgres -f database/schema.sql
```

---

### Passo 2: Execute as Funções (1 min)

**Via Dashboard do Supabase:**

1. No **SQL Editor**, clique em **New Query**
2. Copie todo o conteúdo de `database/queries.sql`
3. Cole no editor
4. Clique em **Run** (ou F5)
5. ✅ Aguarde ~15 segundos até completar

**Via Terminal:**

```bash
psql postgresql://postgres:[SUA-SENHA]@db.[SEU-PROJETO].supabase.co:5432/postgres -f database/queries.sql
```

---

### Passo 3 (OPCIONAL): Dados de Teste

**Apenas se você está em DESENVOLVIMENTO:**

**Via Dashboard:**

1. No **SQL Editor**, clique em **New Query**
2. Copie todo o conteúdo de `database/seeds.sql`
3. Cole no editor
4. Clique em **Run**
5. ✅ Aguarde ~10 segundos

**Via Terminal:**

```bash
psql postgresql://postgres:[SUA-SENHA]@db.[SEU-PROJETO].supabase.co:5432/postgres -f database/seeds.sql
```

---

## ✅ Verificar Instalação

Execute o script de verificação:

**Via Dashboard:**

```sql
-- Cole no SQL Editor e execute
\i database/verify.sql
```

**Via Terminal:**

```bash
psql postgresql://postgres:[SUA-SENHA]@db.[SEU-PROJETO].supabase.co:5432/postgres -f database/verify.sql
```

**Resultado esperado:** Todas as verificações devem mostrar "✓ OK"

---

## 🧪 Testar Rapidamente

Execute estas queries no SQL Editor para testar:

### 1. Ver todos os planos:

```sql
SELECT * FROM plans;
```

**Resultado esperado:** 3 planos (Gratuito, Mensal, Anual)

---

### 2. Buscar veículos (se executou seeds):

```sql
SELECT * FROM search_vehicles(
    p_brands := ARRAY['Honda', 'Toyota'],
    p_min_year := 2020
);
```

**Resultado esperado:** Lista de veículos filtrados

---

### 3. Estatísticas do dashboard:

```sql
SELECT get_dashboard_stats();
```

**Resultado esperado:** JSON com estatísticas gerais

---

### 4. Filtros disponíveis:

```sql
SELECT get_available_filters();
```

**Resultado esperado:** JSON com todos os filtros (estados, marcas, etc.)

---

## 🔗 Obter String de Conexão

### Supabase Dashboard:

1. Vá em **Settings** → **Database**
2. Role até **Connection String**
3. Escolha: **URI** ou **Session mode**
4. Copie e use no seu `.env.local`:

```env
DATABASE_URL="postgresql://postgres:[SUA-SENHA]@db.[SEU-PROJETO].supabase.co:5432/postgres"
```

### Para usar no Next.js:

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## 📝 Primeiras Queries na API

### Exemplo 1: Buscar veículos

```typescript
// app/api/vehicles/search/route.ts
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const { brands, minYear, state } = await request.json()
  
  const { data, error } = await supabase.rpc('search_vehicles', {
    p_brands: brands,
    p_min_year: minYear,
    p_states: state ? [state] : null,
    p_limit: 20
  })
  
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ vehicles: data })
}
```

---

### Exemplo 2: Verificar se usuário pode buscar

```typescript
// app/api/user/can-search/route.ts
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const userId = 'user-uuid-from-auth'
  
  const { data, error } = await supabase.rpc('can_user_search', {
    p_user_id: userId
  })
  
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
```

---

### Exemplo 3: Adicionar aos favoritos

```typescript
// app/api/favorites/add/route.ts
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const { userId, vehicleId, notes } = await request.json()
  
  const { data, error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, vehicle_id: vehicleId, notes })
    .select()
  
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ favorite: data })
}
```

---

## 🚀 Próximos Passos

Agora que seu banco está configurado:

### 1. Configure Autenticação

```typescript
// app/auth/login/page.tsx
import { supabase } from '@/lib/supabase'

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})
```

Supabase Auth já está integrado com a tabela `profiles` via trigger!

---

### 2. Implemente as APIs

Crie rotas em `app/api/` usando as funções SQL:

- `POST /api/vehicles/search` → `search_vehicles()`
- `GET /api/vehicles/[id]` → `get_vehicle_details()`
- `GET /api/dashboard/stats` → `get_dashboard_stats()`
- `GET /api/filters/available` → `get_available_filters()`
- `POST /api/favorites` → INSERT em `favorites`
- etc.

---

### 3. Configure Scraping

Crie um Cron Job (Vercel Cron):

```typescript
// app/api/cron/scrape/route.ts
export async function GET(request: Request) {
  // Verificar secret para segurança
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Buscar leiloeiros que precisam de scraping
  const { data: auctioneers } = await supabase
    .from('auctioneers')
    .select('*')
    .eq('is_active', true)
  
  // Fazer scraping de cada um
  for (const auctioneer of auctioneers) {
    await scrapeAuctioneer(auctioneer)
  }
  
  return Response.json({ success: true })
}
```

---

### 4. Integre com FIPE

```typescript
// lib/fipe.ts
export async function getFipePrice(brand: string, model: string, year: number) {
  // Chamar API FIPE
  const response = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas`)
  // Processar resposta
  // Salvar em fipe_prices
  await supabase.from('fipe_prices').upsert({
    fipe_code: '001004-1',
    brand,
    model,
    year,
    price: fipePrice,
    reference_month: 'outubro/2025'
  })
}
```

---

### 5. Configure Pagamentos

```typescript
// app/api/checkout/route.ts
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const { userId, planId } = await request.json()
  
  // Buscar plano
  const { data: plan } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single()
  
  // Criar checkout session no Stripe
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    line_items: [{
      price: plan.stripe_price_id,
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/plans`,
  })
  
  return Response.json({ sessionId: session.id })
}
```

---

## 📚 Documentação Completa

- **README.md** - Documentação completa do banco
- **RESUMO.md** - Visão geral de todos os SQL
- **examples.sql** - 100+ exemplos de queries
- **migrations_template.sql** - Templates para mudanças futuras
- **verify.sql** - Script de verificação de integridade

---

## 💡 Dicas Importantes

### ✅ Cache de Queries

Use Redis (Upstash) para cachear:
- Filtros disponíveis (atualizar a cada hora)
- Dashboard stats (atualizar a cada 5 minutos)
- Preços FIPE (atualizar diariamente)

### ✅ Performance

- Crie índices adicionais conforme necessário
- Use `EXPLAIN ANALYZE` para queries lentas
- Monitore no Dashboard do Supabase

### ✅ Segurança

- RLS já está habilitado
- Use `auth.uid()` nas políticas
- Nunca exponha chaves do servidor no frontend

### ✅ Backup

Configure backup automático no Supabase:
- Settings → Database → Backup
- Recomendado: diário

---

## 🐛 Troubleshooting Rápido

### Erro: "permission denied for table"

```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
```

### Erro: "function does not exist"

Re-execute `queries.sql`

### RLS bloqueando queries

Temporariamente desabilitar (apenas dev):

```sql
ALTER TABLE nome_tabela DISABLE ROW LEVEL SECURITY;
```

### Queries lentas

Verificar índices:

```sql
EXPLAIN ANALYZE
SELECT * FROM vehicles WHERE brand = 'Honda';
```

---

## ✅ Checklist Final

Antes de ir para produção:

- [ ] Schema instalado (`schema.sql`)
- [ ] Funções instaladas (`queries.sql`)
- [ ] Verificação passou (`verify.sql`)
- [ ] RLS habilitado em todas as tabelas
- [ ] Backup configurado
- [ ] Variáveis de ambiente configuradas
- [ ] APIs testadas
- [ ] Autenticação funcionando
- [ ] Seeds NÃO executados em produção

---

## 🎉 Pronto!

Seu banco de dados está 100% funcional!

**Próximo:** Implemente o frontend com Next.js + Tailwind + Shadcn/ui

**Dúvidas?** Consulte `README.md` para documentação completa.

---

**Boa codificação! 🚀**

