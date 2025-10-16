# ⏰ GitHub Actions Cron - Scraping Automático

Este documento explica como configurar o scraping automático usando GitHub Actions.

---

## 📋 Visão Geral

O sistema de scraping é executado **automaticamente a cada 6 horas** via GitHub Actions, sem depender do cron job da Vercel (que é limitado a 1x/dia no plano Hobby).

### **Horários de Execução:**
- **00:00 UTC** (21:00 horário de Brasília)
- **06:00 UTC** (03:00 horário de Brasília)
- **12:00 UTC** (09:00 horário de Brasília)
- **18:00 UTC** (15:00 horário de Brasília)

---

## ⚙️ Configuração Inicial

### **1. Configurar GitHub Secrets**

Para que o GitHub Actions possa chamar sua API na Vercel, você precisa configurar 2 secrets:

#### **a) CRON_SECRET**

1. Acesse seu repositório no GitHub
2. Vá em **Settings** → **Secrets and variables** → **Actions**
3. Clique em **New repository secret**
4. Preencha:
   - **Name:** `CRON_SECRET`
   - **Secret:** Copie o valor de `CRON_SECRET` do seu arquivo `.env`
5. Clique em **Add secret**

#### **b) VERCEL_URL**

1. Na mesma página de Secrets
2. Clique em **New repository secret**
3. Preencha:
   - **Name:** `VERCEL_URL`
   - **Secret:** A URL do seu deploy na Vercel (ex: `https://seu-projeto.vercel.app`)
4. Clique em **Add secret**

**⚠️ IMPORTANTE:** Não inclua a barra final `/` na URL!

---

## 🚀 Como Funciona

### **Arquivo do Workflow**

```yaml
# .github/workflows/scraping-cron.yml
name: Scraping Automático

on:
  schedule:
    - cron: '0 */6 * * *'  # A cada 6 horas
  workflow_dispatch:        # Permite execução manual

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - name: Executar scraping de veículos
        run: |
          curl -X POST ${{ secrets.VERCEL_URL }}/api/cron/scrape \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### **Fluxo de Execução**

1. GitHub Actions dispara no horário agendado
2. Faz uma requisição POST para `/api/cron/scrape`
3. A rota valida o Bearer token (`CRON_SECRET`)
4. Se autorizado, executa o scraping de todos os leiloeiros
5. Retorna um JSON com estatísticas

---

## 🧪 Testando Manualmente

### **1. Via Interface do GitHub**

1. Acesse seu repositório no GitHub
2. Vá em **Actions**
3. Selecione o workflow **"Scraping Automático"**
4. Clique em **Run workflow**
5. Selecione a branch (geralmente `main`)
6. Clique em **Run workflow**

Aguarde alguns segundos e veja o resultado dos logs!

### **2. Via Terminal (local)**

```bash
curl -X POST https://seu-projeto.vercel.app/api/cron/scrape \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  -H "Content-Type: application/json"
```

Substitua:
- `seu-projeto.vercel.app` pela sua URL da Vercel
- `SEU_CRON_SECRET` pelo valor do seu `.env`

---

## 📊 Monitoramento

### **Ver Logs de Execução**

1. Acesse **Actions** no GitHub
2. Clique no workflow **"Scraping Automático"**
3. Veja a lista de execuções (com ✅ sucesso ou ❌ erro)
4. Clique em uma execução para ver logs detalhados

### **Exemplo de Resposta de Sucesso**

```json
{
  "success": true,
  "timestamp": "2025-01-11T12:00:00.000Z",
  "executionTimeMs": 45230,
  "summary": {
    "totalAuctioneers": 1,
    "totalScraped": 156,
    "totalCreated": 12,
    "totalUpdated": 144,
    "totalErrors": 0
  },
  "results": [
    {
      "auctioneer": "Sodré Santoro",
      "success": true,
      "scraped": 156,
      "created": 12,
      "updated": 144,
      "errors": 0,
      "executionTimeMs": 45230
    }
  ]
}
```

---

## 🛠️ Troubleshooting

### **Erro: "Unauthorized"**

**Causa:** `CRON_SECRET` não configurado ou incorreto no GitHub Secrets.

**Solução:**
1. Verifique se o secret `CRON_SECRET` existe em Settings → Secrets
2. Confirme que o valor é exatamente igual ao do seu `.env`
3. Não há espaços extras antes/depois do valor

---

### **Erro: "Connection refused" ou "Not found"**

**Causa:** `VERCEL_URL` incorreto ou projeto não deployado.

**Solução:**
1. Verifique se `VERCEL_URL` está correto (sem `/` no final)
2. Confirme que seu projeto está deployado na Vercel
3. Teste a URL manualmente no navegador: `https://seu-projeto.vercel.app`

---

### **Workflow não está executando automaticamente**

**Causa:** GitHub Actions pode ter atraso de até 15 minutos.

**Solução:**
1. Aguarde até 15 minutos após o horário agendado
2. Execute manualmente para testar: **Actions** → **Run workflow**
3. Verifique se há erros no workflow

---

## 💰 Custos

- **GitHub Actions:** GRÁTIS (2.000 minutos/mês)
- **Vercel Hobby:** GRÁTIS (continua no plano gratuito)
- **Custo Total:** R$ 0 💚

Com 4 execuções diárias de ~1 minuto cada:
- Uso mensal: ~120 minutos
- Limite gratuito: 2.000 minutos
- Sobra: 1.880 minutos! 🎉

---

## 🔄 Alterando o Horário

Para alterar a frequência do cron, edite `.github/workflows/scraping-cron.yml`:

```yaml
# A cada 12 horas (00:00 e 12:00 UTC)
- cron: '0 */12 * * *'

# A cada 4 horas
- cron: '0 */4 * * *'

# Todos os dias às 09:00 UTC (06:00 Brasília)
- cron: '0 9 * * *'

# Segunda a sexta às 14:00 UTC (11:00 Brasília)
- cron: '0 14 * * 1-5'
```

**Ferramenta útil:** https://crontab.guru/

---

## 📚 Recursos Adicionais

- [Documentação GitHub Actions](https://docs.github.com/en/actions)
- [Sintaxe de Cron](https://crontab.guru/)
- [GitHub Actions Pricing](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions)

---

**Criado em:** 2025-01-11  
**Última atualização:** 2025-01-11

