# LeilãoMax - Documentação de Desenvolvimento

## 📚 Visão Geral

O LeilãoMax é uma plataforma de agregação de leilões de veículos que centraliza todos os leilões do Brasil em um único lugar, permitindo comparação inteligente com preços FIPE e identificação de melhores negócios.

## 🏗️ Arquitetura

### Stack Tecnológica
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Puppeteer (scraping)
- **Database**: Supabase (PostgreSQL)
- **Cache**: Upstash Redis
- **Pagamentos**: Stripe
- **Deploy**: Vercel

### Estrutura de Pastas

```
leilaoapp/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── vehicles/      # Endpoints de veículos
│   │   │   └── cron/          # Cron jobs (scraping)
│   │   ├── buscar/            # Página de busca
│   │   ├── globals.css        # Estilos globais
│   │   ├── layout.tsx         # Layout raiz
│   │   └── page.tsx           # Homepage
│   ├── components/
│   │   ├── ui/                # Componentes UI (shadcn)
│   │   └── vehicles/          # Componentes de veículos
│   ├── lib/
│   │   ├── supabase/          # Cliente Supabase
│   │   ├── scraping/          # Sistema de scraping
│   │   ├── fipe.ts            # Integração API FIPE
│   │   ├── scoring.ts         # Cálculo de deal score
│   │   ├── redis.ts           # Cache Redis
│   │   └── utils.ts           # Utilitários
│   └── types/                 # TypeScript types
├── supabase/
│   └── schema.sql             # Schema do banco de dados
├── public/                    # Arquivos estáticos
└── ...
```

## 🔧 Configuração

### 1. Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# FIPE
FIPE_API_URL=https://parallelum.com.br/fipe/api/v1

# Cron
CRON_SECRET=seu_secret_aqui
```

### 2. Instalação

```bash
npm install
```

### 3. Configurar Supabase

Execute o schema SQL em `supabase/schema.sql` no SQL Editor do Supabase.

### 4. Desenvolvimento

```bash
npm run dev
```

## 🎯 Funcionalidades Principais

### 1. Sistema de Scraping

**Localização**: `src/lib/scraping/scraper.ts`

- Web scraping com Puppeteer
- Parsing automático de títulos de veículos
- Integração com API FIPE
- Cálculo automático de deal score

**Cron Job**: `src/app/api/cron/scrape/route.ts`
- Executa a cada 6 horas
- Configurado em `vercel.json`

### 2. Deal Score

**Localização**: `src/lib/scoring.ts`

Algoritmo de pontuação (0-100) baseado em:
- **40 pontos**: Desconto em relação à FIPE
- **20 pontos**: Ano do veículo
- **15 pontos**: Quilometragem
- **15 pontos**: Tipo de leilão
- **10 pontos**: Aceita financiamento

### 3. API de Veículos

**Endpoint**: `/api/vehicles`

**Filtros suportados**:
- `estado`, `cidade`
- `tipo_veiculo`, `marca`, `modelo`
- `ano_min`, `ano_max`
- `preco_min`, `preco_max`
- `km_max`
- `search` (busca textual)
- `page`, `limit` (paginação)

**Cache**: Redis com TTL de 1 hora

### 4. Autenticação

- Supabase Auth
- Row Level Security (RLS)
- Middleware para refresh de sessão

## 📊 Banco de Dados

### Tabelas Principais

1. **vehicles**: Dados dos veículos
2. **users**: Perfis de usuários
3. **user_favorites**: Favoritos
4. **user_searches**: Histórico de buscas
5. **subscriptions**: Assinaturas Stripe

### Índices

- Performance otimizada para buscas
- Full-text search em português
- Índices em colunas de filtro

## 🚀 Deploy

### Vercel

1. Conecte o repositório GitHub
2. Configure as variáveis de ambiente
3. Deploy automático em cada push

### Cron Jobs

Configurado em `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/scrape",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

## 🔐 Segurança

- RLS habilitado em todas as tabelas
- Autenticação via Supabase Auth
- API routes protegidas
- Cron jobs com secret token
- CORS configurado

## 📈 Próximos Passos

### MVP (Fases 1-2)
- [ ] Implementar mais leiloeiros
- [ ] Sistema de alertas por email
- [ ] Dashboard de usuário completo
- [ ] Integração Stripe

### Versão 1.0
- [ ] 20+ leiloeiros
- [ ] Sistema de favoritos
- [ ] Histórico de buscas
- [ ] SEO otimizado

### Futuro
- [ ] App mobile
- [ ] Sistema de afiliação
- [ ] Análise de tendências
- [ ] API pública

## 🐛 Debugging

### Logs
- Verifique logs no Vercel Dashboard
- Logs do Supabase em tempo real
- Redis insights no Upstash

### Common Issues
1. **Scraping falha**: Verificar seletores CSS
2. **Cache desatualizado**: Invalidar manualmente
3. **FIPE timeout**: Implementar retry logic

## 📝 Licença

Proprietary - Todos os direitos reservados
