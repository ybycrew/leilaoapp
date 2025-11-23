# 🚀 Guia de Instalação - YbyBid

## ✅ Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase (grátis)
- Conta no Upstash Redis (grátis)
- Conta no Stripe (para pagamentos)
- Conta no Vercel (para deploy)

## 📦 Passo a Passo

### 1. Instalar Dependências

```bash
cd C:\Users\lucas\projetos\leilaoapp
npm install
```

### 2. Configurar Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Vá em **Project Settings > API**
3. Copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`
4. Vá em **SQL Editor** e execute o arquivo `supabase/schema.sql`

### 3. Configurar Upstash Redis

1. Acesse [upstash.com](https://upstash.com) e crie um database
2. Copie as credenciais:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 4. Configurar Stripe (Opcional para MVP)

1. Acesse [stripe.com](https://stripe.com) e crie uma conta
2. Vá em **Developers > API Keys**
3. Copie:
   - `Publishable key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `Secret key` → `STRIPE_SECRET_KEY`

### 5. Preencher .env

Edite o arquivo `.env` na raiz do projeto com todas as chaves:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui

# Upstash Redis
UPSTASH_REDIS_REST_URL=sua_url_redis_aqui
UPSTASH_REDIS_REST_TOKEN=seu_token_aqui

# Stripe (opcional para início)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# FIPE API (já configurado)
FIPE_API_URL=https://parallelum.com.br/fipe/api/v1

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=escolha_um_secret_seguro_aqui

# Scraping
SCRAPING_TIMEOUT=30000
MAX_CONCURRENT_SCRAPERS=5
```

### 6. Iniciar o Projeto

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

## 🔧 Próximas Tarefas Importantes

### Tarefa 1: Configurar Leiloeiros Reais

Edite `src/app/api/cron/scrape/route.ts` e adicione os leiloeiros reais:

```typescript
const AUCTION_SITES = [
  {
    name: 'Sodré Santoro',
    url: 'https://www.sodresantoro.com.br/leiloes',
    selectors: {
      vehicleList: '.lote-item',
      title: '.lote-titulo',
      price: '.lote-preco',
      image: '.lote-imagem img',
      link: 'a.lote-link',
    },
  },
  // Adicione mais leiloeiros aqui...
];
```

### Tarefa 2: Adicionar Autenticação

1. Em Supabase, configure os provedores de autenticação
2. Habilite Email/Password ou OAuth (Google, GitHub)
3. Configure URLs de callback em **Authentication > URL Configuration**

### Tarefa 3: Testar Scraping

```bash
# Executar scraping manualmente
curl http://localhost:3000/api/cron/scrape \
  -H "Authorization: Bearer seu_cron_secret_aqui"
```

### Tarefa 4: Deploy no Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variáveis de ambiente no dashboard
```

## 📝 Estrutura de Dados

### Exemplo de Veículo no Banco:

```json
{
  "id": "uuid",
  "leiloeiro": "Sodré Santoro",
  "leiloeiro_url": "https://...",
  "titulo": "FIAT UNO MILLE 1.0 2015",
  "marca": "FIAT",
  "modelo": "UNO MILLE",
  "ano": 2015,
  "preco_atual": 18500.00,
  "fipe_preco": 25000.00,
  "deal_score": 87,
  "cidade": "São Paulo",
  "estado": "SP",
  "tipo_veiculo": "carro",
  "tipo_leilao": "online",
  "imagens": ["url1", "url2"],
  "data_leilao": "2025-10-15T10:00:00Z"
}
```

## 🐛 Troubleshooting

### Erro: "Module not found"
```bash
npm install
```

### Erro: Supabase connection
- Verifique se as URLs estão corretas no `.env`
- Confirme que o schema SQL foi executado

### Erro: Redis timeout
- Verifique credenciais do Upstash
- Confirme que o database Redis está ativo

### Scraping não funciona
1. Verifique seletores CSS dos sites
2. Alguns sites podem bloquear bots
3. Use proxies se necessário

## 📚 Recursos Úteis

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Puppeteer Docs](https://pptr.dev)

## 🎯 Roadmap Sugerido

**Semana 1-2**: Setup e MVP básico
- ✅ Setup do projeto
- [ ] Configurar 3-5 leiloeiros
- [ ] Testar scraping
- [ ] UI básica funcionando

**Semana 3-4**: Funcionalidades core
- [ ] Sistema de busca e filtros
- [ ] Autenticação de usuários
- [ ] Sistema de favoritos
- [ ] Deploy inicial

**Semana 5-6**: Monetização
- [ ] Integração Stripe
- [ ] Sistema de planos
- [ ] Limite de buscas
- [ ] Dashboard do usuário

**Semana 7-8**: Polish e lançamento
- [ ] SEO otimizado
- [ ] Performance tuning
- [ ] Testes finais
- [ ] Lançamento beta

## 💡 Dicas

1. **Comece pequeno**: Implemente 3-5 leiloeiros primeiro
2. **Teste constantemente**: Rode o scraping a cada mudança
3. **Cache agressivo**: Use Redis para reduzir chamadas ao banco
4. **Monitore custos**: Supabase e Redis têm limites gratuitos
5. **Documente seletores**: Mude sites mudam estrutura com frequência

## 🆘 Precisa de Ajuda?

1. Verifique `DEVELOPMENT.md` para detalhes técnicos
2. Consulte logs no Vercel/Supabase
3. Teste APIs com Postman/Insomnia
4. Use React DevTools para debug do frontend

Bom desenvolvimento! 🚀
