# 🧪 Guia de Testes - Ybybid Scraper

## 🎯 Como Testar o Scraper do Sodré Santoro

### **Método 1: Teste Standalone (Mais Fácil)**

Apenas testar se o scraper funciona, sem salvar no banco:

```bash
npx tsx test-scraper.ts
```

**O que ele faz:**
- ✅ Acessa o site Sodré Santoro
- ✅ Percorre todas as páginas
- ✅ Extrai dados dos veículos
- ✅ Mostra os primeiros 5 veículos no console
- ✅ Salva todos os dados em `scraped-vehicles.json`

**Tempo estimado:** 2-5 minutos

---

### **Método 2: Teste Completo (Com Banco de Dados)**

Testar todo o fluxo incluindo salvamento no banco:

#### **Pré-requisitos:**

1. **Criar o leiloeiro no Supabase:**

```sql
-- Execute no SQL Editor do Supabase
INSERT INTO auctioneers (name, website_url, is_active)
VALUES ('Sodré Santoro', 'https://www.sodresantoro.com.br', true);
```

2. **Configurar variáveis de ambiente:**

Arquivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
CRON_SECRET=abc123
```

3. **Executar via API:**

```bash
# Iniciar servidor Next.js
npm run dev
```

Em outro terminal:

```bash
# Chamar API de scraping
curl -X POST http://localhost:3000/api/cron/scrape \
  -H "Authorization: Bearer abc123"
```

Ou acesse no navegador:
```
http://localhost:3000/api/cron/scrape?secret=abc123
```

---

### **Método 3: Teste Via Script NPM**

Adicione ao `package.json`:

```json
{
  "scripts": {
    "test:scraper": "tsx test-scraper.ts"
  }
}
```

Depois execute:

```bash
npm run test:scraper
```

---

## 📊 O Que Esperar

### **Saída Esperada:**

```
🚀 Iniciando teste do scraper Sodré Santoro...

[Sodré Santoro] Acessando https://www.sodresantoro.com.br/veiculos
[Sodré Santoro] Processando página 1...
[Sodré Santoro] Página 1: 24 veículos encontrados
[Sodré Santoro] Processando página 2...
[Sodré Santoro] Página 2: 24 veículos encontrados
...
[Sodré Santoro] Última página alcançada
[Sodré Santoro] ✅ Total de veículos coletados: 320

✅ Scraping concluído com sucesso!

📊 Total de veículos encontrados: 320

📋 Primeiros 5 veículos:

1. CHEVROLET ONIX 1.0 FLEX
   Marca: Chevrolet | Modelo: Onix
   Preço: R$ 45.000
   Localização: São Paulo/SP
   KM: 35.000
   URL: https://www.sodresantoro.com.br/veiculo/123

...
```

---

## 🐛 Troubleshooting

### **Erro: "Chromium not found"**

```bash
# Instalar chromium manualmente
npx puppeteer browsers install chrome
```

### **Erro: "Timeout aguardando seletores"**

Possíveis causas:
- Site mudou estrutura (verificar seletores CSS)
- Internet lenta (aumentar timeout)
- Site bloqueou o scraper (adicionar mais delays)

### **Erro: "Leiloeiro não encontrado no banco"**

Execute o SQL para criar o leiloeiro:

```sql
INSERT INTO auctioneers (name, website_url, is_active)
VALUES ('Sodré Santoro', 'https://www.sodresantoro.com.br', true);
```

---

## 📁 Arquivos Gerados

- `scraped-vehicles.json` - Dados brutos extraídos (só no Método 1)
- `scraping_logs` (tabela) - Logs de execução (só no Método 2)
- `vehicles` (tabela) - Veículos salvos no banco (só no Método 2)

---

## 🎯 Próximos Passos

Depois de testar com sucesso:

1. ✅ Configurar cron job no Vercel
2. ✅ Adicionar mais leiloeiros
3. ✅ Configurar alertas de erro
4. ✅ Implementar página de detalhes dos veículos

---

## 📞 Precisa de Ajuda?

Se encontrar erros, me envie:
1. A mensagem de erro completa
2. O que estava tentando fazer (Método 1, 2 ou 3)
3. Print do console/terminal

