# 🕷️ Guia Completo de Scraping - LeilãoMax

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Como Adaptar para um Novo Leiloeiro](#como-adaptar-para-um-novo-leiloeiro)
4. [Testando o Scraper](#testando-o-scraper)
5. [Configurando Cron Job](#configurando-cron-job)
6. [Boas Práticas](#boas-práticas)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O sistema de scraping do LeilãoMax é modular e extensível:

- **Classe Base**: `BaseScraper` - Fornece métodos utilitários
- **Scrapers Específicos**: Um para cada leiloeiro
- **Orquestrador**: `index.ts` - Coordena todos os scrapers
- **Cron Job**: Executa automaticamente a cada 6-12 horas

### Fluxo de Funcionamento:

```
1. Cron Job Dispara (Vercel)
   ↓
2. runAllScrapers() executa cada scraper
   ↓
3. Scraper acessa site do leiloeiro
   ↓
4. Extrai dados dos veículos
   ↓
5. Busca preço FIPE para cada veículo
   ↓
6. Calcula Deal Score
   ↓
7. Salva no banco (Supabase)
   ↓
8. Registra log de execução
```

---

## 🏗️ Arquitetura

```
src/lib/scraping/
├── base-scraper.ts              # Classe abstrata base
├── index.ts                     # Orquestrador principal
├── utils.ts                     # Funções auxiliares
└── scrapers/
    ├── sodre-santoro.ts         # Exemplo implementado
    ├── superbid.ts              # Adicionar...
    ├── leiloes-vip.ts           # Adicionar...
    └── [...outros...]
```

---

## 🛠️ Como Adaptar para um Novo Leiloeiro

### Passo 1: Criar arquivo do scraper

Crie `src/lib/scraping/scrapers/nome-leiloeiro.ts`:

```typescript
import { BaseScraper, VehicleData } from '../base-scraper';

export class NomeLeiloeiro extends BaseScraper {
  private readonly baseUrl = 'https://site-do-leiloeiro.com.br';
  private readonly vehiclesUrl = `${this.baseUrl}/veiculos`;

  constructor() {
    super('Nome do Leiloeiro');
  }

  async scrapeVehicles(): Promise<VehicleData[]> {
    if (!this.page) throw new Error('Página não inicializada');

    const vehicles: VehicleData[] = [];

    // SEU CÓDIGO AQUI

    return vehicles;
  }
}
```

### Passo 2: Inspecionar o site do leiloeiro

Use o **Chrome DevTools** (F12):

1. Acesse o site do leiloeiro
2. Vá na aba **Elements**
3. Encontre os seletores CSS dos elementos:
   - Lista de veículos
   - Título do veículo
   - Preço/Lance
   - Imagens
   - Link para detalhes
   - Etc.

### Passo 3: Implementar a lógica de scraping

#### Exemplo: Extrair lista de veículos

```typescript
async scrapeVehicles(): Promise<VehicleData[]> {
  if (!this.page) throw new Error('Página não inicializada');

  // 1. Navegar para a página
  await this.page.goto(this.vehiclesUrl, {
    waitUntil: 'networkidle2',
  });

  // 2. Aguardar elementos carregarem
  await this.page.waitForSelector('.vehicle-card');

  // 3. Extrair links dos veículos
  const links = await this.page.evaluate(() => {
    const cards = document.querySelectorAll('.vehicle-card a');
    return Array.from(cards).map(a => (a as HTMLAnchorElement).href);
  });

  // 4. Processar cada veículo
  const vehicles: VehicleData[] = [];
  for (const link of links) {
    const vehicle = await this.scrapeVehicleDetail(link);
    if (vehicle) vehicles.push(vehicle);
  }

  return vehicles;
}
```

#### Exemplo: Extrair detalhes do veículo

```typescript
private async scrapeVehicleDetail(url: string): Promise<VehicleData | null> {
  if (!this.page) return null;

  await this.page.goto(url);

  // Extrair dados usando métodos auxiliares
  const title = await this.safeExtractText('h1.title');
  const priceText = await this.safeExtractText('.price');
  const imageUrl = await this.safeExtractAttribute('img.main', 'src');

  // Processar dados
  const price = this.parsePrice(priceText);
  const { brand, model } = this.parseTitleForBrandModel(title);

  return {
    external_id: url.split('/').pop() || '',
    title,
    brand,
    model,
    current_bid: price,
    original_url: url,
    thumbnail_url: imageUrl,
    // ... outros campos
  };
}
```

### Passo 4: Registrar no orquestrador

Em `src/lib/scraping/index.ts`, adicione seu scraper:

```typescript
import { NomeLeiloeiro } from './scrapers/nome-leiloeiro';

const scrapers = [
  new SodreSantoroScraper(),
  new NomeLeiloeiro(),  // <-- Adicione aqui
];
```

### Passo 5: Cadastrar no banco

Execute este SQL no Supabase:

```sql
INSERT INTO auctioneers (name, slug, website_url, scrape_frequency_hours)
VALUES ('Nome do Leiloeiro', 'nome-leiloeiro', 'https://site.com.br', 12);
```

---

## 🧪 Testando o Scraper

### Teste Local (via script)

Crie um arquivo de teste `test-scraper.ts`:

```typescript
import { SodreSantoroScraper } from './src/lib/scraping/scrapers/sodre-santoro';

async function test() {
  const scraper = new SodreSantoroScraper();
  const vehicles = await scraper.run();
  console.log(`Encontrados ${vehicles.length} veículos:`);
  console.log(JSON.stringify(vehicles.slice(0, 3), null, 2));
}

test();
```

Execute:

```bash
npx tsx test-scraper.ts
```

### Teste via API

1. Configure `CRON_SECRET` no `.env.local`:
```env
CRON_SECRET="meu-secret-super-secreto-123"
```

2. Execute:
```bash
curl -H "Authorization: Bearer meu-secret-super-secreto-123" \
  http://localhost:3001/api/cron/scrape
```

3. Veja a resposta:
```json
{
  "success": true,
  "summary": {
    "totalAuctioneers": 1,
    "totalScraped": 15,
    "totalCreated": 15,
    "totalUpdated": 0
  }
}
```

---

## ⏰ Configurando Cron Job

### No Vercel (Produção)

Crie `vercel.json` na raiz do projeto:

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

**Explicação do schedule:**
- `0 */6 * * *` = A cada 6 horas (00:00, 06:00, 12:00, 18:00)
- `0 */12 * * *` = A cada 12 horas
- `0 0 * * *` = Todo dia à meia-noite
- `0 9 * * *` = Todo dia às 9h

### Configurar Variáveis de Ambiente

No Vercel Dashboard:

1. Vá em **Settings** → **Environment Variables**
2. Adicione:
```
CRON_SECRET=seu-secret-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-key-aqui
```

3. Clique em **Save**

---

## ✨ Boas Práticas

### 1. Respeite os Sites

- ✅ Use delays entre requisições (`randomDelay()`)
- ✅ Não faça mais de 1 requisição por segundo
- ✅ Use User-Agent realista
- ✅ Respeite robots.txt

### 2. Tratamento de Erros

```typescript
try {
  const vehicle = await this.scrapeVehicleDetail(link);
  vehicles.push(vehicle);
} catch (error) {
  console.error(`Erro ao processar ${link}:`, error);
  // Continua para o próximo veículo
}
```

### 3. Limite de Veículos

Para testes, limite a quantidade:

```typescript
const maxVehicles = process.env.NODE_ENV === 'production' ? 500 : 20;
for (let i = 0; i < Math.min(links.length, maxVehicles); i++) {
  // ...
}
```

### 4. Logs Informativos

```typescript
console.log(`[${this.auctioneerName}] Processando ${i + 1}/${total}`);
```

### 5. Validação de Dados

```typescript
if (!vehicleData.brand || !vehicleData.model) {
  console.warn('Veículo sem marca/modelo, pulando...');
  return null;
}
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find selector"

**Causa:** O site mudou a estrutura HTML

**Solução:** 
1. Inspecione o site novamente
2. Atualize os seletores CSS
3. Teste localmente antes de fazer deploy

### Erro: "Timeout waiting for selector"

**Causa:** Site demora para carregar ou seletor está errado

**Solução:**
```typescript
await this.page.waitForSelector('.card', {
  timeout: 10000 // Aumentar timeout
}).catch(() => {
  console.log('Timeout, tentando continuar...');
});
```

### Erro: "Too many requests / Blocked"

**Causa:** Site detectou scraping

**Solução:**
1. Aumente os delays
2. Use proxy rotativo (se necessário)
3. Adicione mais headers realistas

### Puppeteer não inicia

**Causa:** Falta de dependências no sistema

**Solução (Ubuntu/Debian):**
```bash
sudo apt-get install -y \
  libnss3 libxss1 libasound2 \
  libatk-bridge2.0-0 libgtk-3-0
```

**Solução (Vercel):**
Use `puppeteer-core` com Chrome headless da AWS Lambda:
```bash
npm install chrome-aws-lambda puppeteer-core
```

---

## 📚 Recursos Adicionais

- [Puppeteer Docs](https://pptr.dev/)
- [CSS Selectors Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- [Cron Schedule Expressions](https://crontab.guru/)

---

## 🎯 Checklist de Novo Scraper

- [ ] Criar arquivo `scrapers/nome.ts`
- [ ] Estender `BaseScraper`
- [ ] Implementar `scrapeVehicles()`
- [ ] Testar localmente
- [ ] Cadastrar leiloeiro no banco
- [ ] Adicionar ao orquestrador
- [ ] Testar via API
- [ ] Fazer deploy
- [ ] Monitorar logs

---

**Pronto! Agora você pode adicionar quantos leiloeiros quiser! 🚀**

