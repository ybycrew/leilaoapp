# ⚙️ Configuração de Variáveis de Ambiente

Este guia mostra como configurar as variáveis de ambiente do projeto **Ybybid**.

---

## 📋 Passo 1: Criar o arquivo `.env.local`

Na raiz do projeto, crie um arquivo chamado `.env.local` com o seguinte conteúdo:

```env
# ==========================================
# VARIÁVEIS DE AMBIENTE - YBYBID
# ==========================================

# ------------------------------------------
# SUPABASE
# ------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# ------------------------------------------
# SITE URL (OAuth Callbacks)
# ------------------------------------------
# Desenvolvimento
NEXT_PUBLIC_SITE_URL=http://localhost:3000
# Produção
# NEXT_PUBLIC_SITE_URL=https://seudominio.com

# ------------------------------------------
# STRIPE - PAGAMENTOS
# ------------------------------------------
# Chaves da API do Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# IDs dos Produtos e Preços (Assinatura Mensal)
STRIPE_PRODUCT_MONTHLY=prod_TDZTmujpR72rd2
STRIPE_PRICE_MONTHLY=price_1SH8KmF9OeA0H1YRmZLPGYC2

# ------------------------------------------
# API SECRETS
# ------------------------------------------
# Segredo para proteger cron jobs
CRON_SECRET=your-random-secret-for-cron-jobs

# ------------------------------------------
# FIPE API (Opcional - Sincronização Local)
# ------------------------------------------
# URL base da API FIPE (padrão: https://fipe.parallelum.com.br/api/v2)
# FIPE_API_URL=https://fipe.parallelum.com.br/api/v2
# Token de acesso, caso a API exija autenticação
# FIPE_API_TOKEN=seu-token-ilimitado
# Cabeçalho usado para enviar o token (padrão: X-Subscription-Token)
# FIPE_API_TOKEN_HEADER=X-Subscription-Token
# Prefixo aplicado ao token (padrão: vazio)
# FIPE_API_TOKEN_PREFIX=
# Nome do parâmetro de query para enviar o token (use apenas se a API exigir na URL)
# FIPE_API_TOKEN_QUERY=token
# Timeout personalizado em ms (padrão: 15000)
# FIPE_API_TIMEOUT_MS=20000
# User-Agent personalizado para requisições
# FIPE_API_USER_AGENT=ybybid-fipe-sync/1.0

# ------------------------------------------
# REDIS (Opcional - Cache)
# ------------------------------------------
REDIS_URL=redis://localhost:6379
```

---

## 🔑 Passo 2: Preencher as Variáveis

### **Supabase** (já configurado)
- `NEXT_PUBLIC_SUPABASE_URL`: URL do seu projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Chave anônima pública

### **Stripe** (suas credenciais)

#### **1. Chaves da API:**
- Acesse: https://dashboard.stripe.com/test/apikeys
- Copie:
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Chave Publicável (começa com `pk_test_`)
  - `STRIPE_SECRET_KEY`: Chave Secreta (começa com `sk_test_`)

#### **2. Webhook Secret:**
- Acesse: https://dashboard.stripe.com/test/webhooks
- Crie um novo endpoint: `http://localhost:3000/api/webhooks/stripe`
- Copie o `STRIPE_WEBHOOK_SECRET` (começa com `whsec_`)

#### **3. Product e Price IDs** (já configurados):
- ✅ `STRIPE_PRODUCT_MONTHLY`: `prod_TDZTmujpR72rd2`
- ✅ `STRIPE_PRICE_MONTHLY`: `price_1SH8KmF9OeA0H1YRmZLPGYC2`

### **Site URL**
- Desenvolvimento: `http://localhost:3000`
- Produção: Sua URL de produção

### **CRON_SECRET**
- Gere um segredo aleatório:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

---

## 🚀 Passo 3: Reiniciar o Servidor

Após configurar o `.env.local`, reinicie o servidor:

```bash
# Parar o servidor (Ctrl+C)
# Iniciar novamente
npm run dev
```

---

## 📝 **Exemplo de `.env.local` preenchido:**

```env
# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# SITE URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# STRIPE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51AbC123xyz...
STRIPE_SECRET_KEY=sk_test_51AbC123xyz...
STRIPE_WEBHOOK_SECRET=whsec_abc123xyz...

# STRIPE PRODUCTS
STRIPE_PRODUCT_MONTHLY=prod_TDZTmujpR72rd2
STRIPE_PRICE_MONTHLY=price_1SH8KmF9OeA0H1YRmZLPGYC2

# API SECRETS
CRON_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# REDIS (opcional)
REDIS_URL=redis://localhost:6379
```

---

## ✅ Verificar Configuração

Execute o servidor e verifique se não há erros:

```bash
npm run dev
```

Se tudo estiver correto, você verá:
```
✓ Ready in 2s
- Local:        http://localhost:3000
```

---

## 🔒 Segurança

⚠️ **IMPORTANTE:**
- **NUNCA** commite o arquivo `.env.local` no Git
- O arquivo já está no `.gitignore`
- Use variáveis diferentes para desenvolvimento e produção
- Mantenha suas chaves secretas seguras

---

## 📚 Documentação Adicional

- [Stripe API Keys](https://stripe.com/docs/keys)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/local-development#environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

**Criado em**: 2025-10-11
**Última atualização**: 2025-10-11


