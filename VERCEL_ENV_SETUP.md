# 🔧 Configuração de Variáveis de Ambiente no Vercel

## Variáveis Necessárias para o Scraping Console

Para que o `/api/scraping/proxy/[...path]` funcione no Vercel, você precisa configurar:

### 1️⃣ Acesse o Dashboard do Vercel
1. Vá para [vercel.com](https://vercel.com)
2. Selecione seu projeto `leilaoapp`
3. Vá em **Settings** → **Environment Variables**

### 2️⃣ Adicione as Variáveis

```env
SCRAPE_API_URL=http://IP_DA_VPS:4060
SCRAPE_API_TOKEN=seu_token_secreto_aqui
```

**Importante:**
- `SCRAPE_API_URL`: Deve ser o IP público da sua VPS + porta 4060
  - Exemplo: `http://123.45.67.89:4060` ou `http://srv879590.hostgator.com.br:4060`
- `SCRAPE_API_TOKEN`: O mesmo token que está configurado na VPS no `.env` como `SCRAPE_API_TOKEN`

### 3️⃣ Verificar Token na VPS

Execute na VPS para ver qual token está configurado:

```bash
cd /opt/leilaoapp
grep SCRAPE_API_TOKEN .env
```

Ou verifique as variáveis do PM2:

```bash
pm2 env 0 | grep SCRAPE_API_TOKEN
```

### 4️⃣ Como Descobrir o IP Público da VPS

Na VPS, execute:

```bash
curl ifconfig.me
# ou
curl ipinfo.io/ip
```

### 5️⃣ Redeploy Após Adicionar Variáveis

Após adicionar as variáveis no Vercel:
1. Vá em **Deployments**
2. Clique nos 3 pontos do último deployment
3. Clique em **Redeploy**
4. Aguarde o deploy concluir

---

## 🧪 Testar Após Configurar

### Via Console Web
1. Acesse: `https://www.ybybid.com.br/scraping-console`
2. Deve mostrar a lista de leiloeiros
3. Clique em "Start scraping"

### Via API Direta
```bash
curl https://www.ybybid.com.br/api/scraping/proxy/status
```

Se retornar `{"running":false}`, está funcionando! ✅

---

## 🔍 Troubleshooting

### Erro 404 ou "Not found"
- Verifique se `SCRAPE_API_URL` está correto
- Certifique-se de que a VPS permite conexões externas na porta 4060

### Erro 500 ou "Missing SCRAPE_API_URL"
- Verifique se as variáveis estão configuradas no Vercel
- Certifique-se de fazer redeploy após adicionar variáveis

### Erro 401 "Unauthorized"
- Verifique se `SCRAPE_API_TOKEN` no Vercel é igual ao da VPS

### Não consegue conectar na VPS
- Verifique firewall: a porta 4060 deve estar aberta
- Teste na VPS: `curl http://localhost:4060/status`

---

## 🔐 Segurança

⚠️ **IMPORTANTE:** 
- NÃO commite o `.env` no GitHub
- Use variáveis de ambiente do Vercel para secrets
- O `SCRAPE_API_TOKEN` deve ser uma string longa e aleatória

Gere um token seguro:
```bash
openssl rand -hex 32
```



