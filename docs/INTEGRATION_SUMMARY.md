# 🎯 Resumo: Como Integrar Sites de Leiloeiros

## ✅ O Que Foi Criado

Implementei um **sistema completo de scraping** para integrar sites de leiloeiros:

### 📦 Arquivos Criados:

1. **`src/lib/scraping/base-scraper.ts`** - Classe base com métodos úteis
2. **`src/lib/scraping/scrapers/sodre-santoro.ts`** - Scraper de exemplo
3. **`src/lib/scraping/index.ts`** - Orquestrador principal
4. **`src/lib/scraping/utils.ts`** - Funções auxiliares (calculateDealScore, etc.)
5. **`src/app/api/cron/scrape/route.ts`** - API endpoint atualizada
6. **`docs/SCRAPING_GUIDE.md`** - Guia completo (LEIA ESTE!)

---

## 🚀 Como Funciona

### 1. Arquitetura

```
Cron Job (Vercel)
      ↓
 runAllScrapers()
      ↓
  ┌─────────────────┐
  │ Sodré Santoro   │ ──→ Puppeteer ──→ Site Leiloeiro
  │ Superbid        │ ──→ Extrai dados
  │ Leilões VIP     │ ──→ Busca FIPE
  │ [... outros]    │ ──→ Calcula Score
  └─────────────────┘ ──→ Salva Supabase
```

### 2. Classe Base (BaseScraper)

Fornece métodos prontos:

```typescript
// Extrair texto de elementos
await this.safeExtractText('.titulo');

// Extrair atributo
await this.safeExtractAttribute('img', 'src');

// Delay aleatório (anti-detecção)
await this.randomDelay(1000, 3000);

// Parse de preços, anos, etc.
this.parsePrice('R$ 45.000,00'); // → 45000
this.parseYear('2022/2023'); // → { manufacture: 2022, model: 2023 }
```

### 3. Scraper Específico (Exemplo: Sodré Santoro)

```typescript
export class SodreSantoroScraper extends BaseScraper {
  constructor() {
    super('Sodré Santoro');
  }

  async scrapeVehicles(): Promise<VehicleData[]> {
    // 1. Acessa site do leiloeiro
    // 2. Extrai lista de veículos
    // 3. Para cada veículo, extrai detalhes
    // 4. Retorna array de VehicleData
  }
}
```

---

## 📝 Como Adicionar um Novo Leiloeiro (Passo a Passo)

### Passo 1: Inspecionar o Site

1. Abra o site do leiloeiro no Chrome
2. Pressione `F12` (DevTools)
3. Use o **Seletor de Elementos** (ícone de seta)
4. Clique nos elementos e veja os seletores CSS:
   - `.vehicle-card` (card do veículo)
   - `.price` (preço)
   - `h3.title` (título)
   - `img.photo` (imagem)

### Passo 2: Criar o Scraper

Crie `src/lib/scraping/scrapers/novo-leiloeiro.ts`:

```typescript
import { BaseScraper, VehicleData } from '../base-scraper';

export class NovoLeiloeiro extends BaseScraper {
  private readonly baseUrl = 'https://site-leiloeiro.com.br';
  
  constructor() {
    super('Nome do Leiloeiro');
  }

  async scrapeVehicles(): Promise<VehicleData[]> {
    if (!this.page) throw new Error('Página não inicializada');

    const vehicles: VehicleData[] = [];

    // 1. Navegar para o site
    await this.page.goto(`${this.baseUrl}/veiculos`, {
      waitUntil: 'networkidle2',
    });

    // 2. Aguardar cards carregarem
    await this.page.waitForSelector('.vehicle-card');

    // 3. Extrair URLs dos veículos
    const links = await this.page.evaluate(() => {
      const cards = document.querySelectorAll('.vehicle-card a');
      return Array.from(cards).map(a => (a as HTMLAnchorElement).href);
    });

    // 4. Processar cada veículo
    for (const link of links.slice(0, 20)) { // Limite de 20 para teste
      try {
        await this.page.goto(link);

        // Extrair dados
        const title = await this.safeExtractText('h1.title');
        const priceText = await this.safeExtractText('.price');
        const imageUrl = await this.safeExtractAttribute('img.photo', 'src');

        // Processar
        const price = this.parsePrice(priceText);
        const { brand, model } = this.parseTitleForBrandModel(title);

        vehicles.push({
          external_id: link.split('/').pop() || '',
          title,
          brand,
          model,
          current_bid: price,
          state: 'SP', // Extrair do site
          city: 'São Paulo', // Extrair do site
          vehicle_type: 'Carro', // Detectar automaticamente
          original_url: link,
          thumbnail_url: imageUrl,
        });

        await this.randomDelay(1000, 2000); // Delay entre veículos
      } catch (error) {
        console.error(`Erro em ${link}:`, error);
      }
    }

    return vehicles;
  }

  // Método auxiliar para extrair marca/modelo
  private parseTitleForBrandModel(title: string) {
    // Implemente sua lógica aqui
    return { brand: 'Chevrolet', model: 'Onix' };
  }
}
```

### Passo 3: Registrar no Orquestrador

Em `src/lib/scraping/index.ts`:

```typescript
import { NovoLeiloeiro } from './scrapers/novo-leiloeiro';

const scrapers = [
  new SodreSantoroScraper(),
  new NovoLeiloeiro(), // <-- Adicione aqui
];
```

### Passo 4: Cadastrar no Banco

Execute no Supabase SQL Editor:

```sql
INSERT INTO auctioneers (name, slug, website_url, scrape_frequency_hours)
VALUES ('Nome do Leiloeiro', 'nome-leiloeiro', 'https://site.com.br', 12);
```

### Passo 5: Testar

```bash
# Adicione ao .env.local:
CRON_SECRET="teste-123"

# Teste via API:
curl -H "Authorization: Bearer teste-123" http://localhost:3001/api/cron/scrape
```

---

## 🧪 Testando Localmente

### Opção 1: Via Script

Crie `test-scraping.ts`:

```typescript
import { SodreSantoroScraper } from './src/lib/scraping/scrapers/sodre-santoro';

async function test() {
  const scraper = new SodreSantoroScraper();
  const vehicles = await scraper.run();
  console.log(`✅ Encontrados ${vehicles.length} veículos`);
  console.log(vehicles[0]); // Ver primeiro veículo
}

test();
```

Execute:

```bash
npx tsx test-scraping.ts
```

### Opção 2: Via API

```bash
# Terminal 1: Iniciar servidor
npm run dev

# Terminal 2: Chamar API
curl -H "Authorization: Bearer teste-123" http://localhost:3001/api/cron/scrape
```

---

## ⏰ Configurando Scraping Automático (Vercel)

### Criar `vercel.json`:

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

**Schedules comuns:**
- `0 */6 * * *` = A cada 6 horas
- `0 */12 * * *` = A cada 12 horas
- `0 9 * * *` = Todo dia às 9h
- `0 0,12 * * *` = Às 00:00 e 12:00

### Configurar Variáveis no Vercel:

1. Vá em **Settings** → **Environment Variables**
2. Adicione:
   - `CRON_SECRET` = gere um secret forte
   - `SUPABASE_SERVICE_ROLE_KEY` = sua key do Supabase

---

## 📊 Monitoramento

### Ver Logs no Vercel:

1. Vá em **Deployments**
2. Clique no deployment atual
3. Clique em **Functions** → **api/cron/scrape**
4. Veja os logs de execução

### Ver Logs no Supabase:

```sql
-- Últimas execuções
SELECT * FROM scraping_logs
ORDER BY started_at DESC
LIMIT 10;

-- Estatísticas
SELECT 
  a.name,
  COUNT(*) as executions,
  SUM(sl.vehicles_created) as total_created,
  AVG(sl.execution_time_ms) as avg_time_ms
FROM scraping_logs sl
INNER JOIN auctioneers a ON sl.auctioneer_id = a.id
WHERE sl.started_at > NOW() - INTERVAL '7 days'
GROUP BY a.name;
```

---

## ⚠️ IMPORTANTE: Ética de Scraping

### ✅ Faça:

- Use delays entre requisições
- Respeite robots.txt
- Use User-Agent realista
- Limite a quantidade (500 veículos por execução)
- Faça cache de dados
- Execute em horários de baixo tráfego

### ❌ Não Faça:

- Scraping agressivo (muitas requisições por segundo)
- Ignorar bloqueios do site
- Armazenar dados sensíveis sem permissão
- Fazer scraping 24/7 sem pausas

---

## 🛠️ Ferramentas Úteis

### Chrome DevTools

- **Elements**: Ver estrutura HTML
- **Network**: Ver requisições
- **Console**: Testar seletores JavaScript

### Testar Seletores CSS:

No console do Chrome:

```javascript
document.querySelector('.vehicle-card'); // Um elemento
document.querySelectorAll('.vehicle-card'); // Todos elementos
```

### Gerar Cron Secret:

```bash
openssl rand -hex 32
```

---

## 📚 Documentação Completa

Veja o guia detalhado em: **`docs/SCRAPING_GUIDE.md`**

---

## ✅ Checklist Rápido

- [ ] Leu `docs/SCRAPING_GUIDE.md`
- [ ] Inspecionou site do leiloeiro
- [ ] Criou scraper em `scrapers/`
- [ ] Testou localmente
- [ ] Cadastrou leiloeiro no banco
- [ ] Registrou no orquestrador
- [ ] Configurou `CRON_SECRET`
- [ ] Testou via API
- [ ] Criou `vercel.json`
- [ ] Fez deploy
- [ ] Monitorou primeira execução

---

## 🎯 Próximos Passos

1. **Adapte o scraper de exemplo** (`sodre-santoro.ts`) para um leiloeiro real
2. **Teste localmente** com poucos veículos (20-50)
3. **Valide os dados** no banco de dados
4. **Adicione mais leiloeiros** usando o mesmo padrão
5. **Configure cron job** no Vercel
6. **Monitore** execuções e ajuste conforme necessário

---

**Pronto! Você tem tudo que precisa para integrar qualquer leiloeiro! 🚀**

Dúvidas? Consulte `docs/SCRAPING_GUIDE.md` ou abra uma issue no GitHub.

