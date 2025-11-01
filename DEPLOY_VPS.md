# 🚀 Comandos para Deploy na VPS

## Aplicar Mudanças do Superbid na VPS

### 1️⃣ Conectar na VPS via SSH
```bash
ssh root@srv879590.hostgator.com.br
# ou
ssh root@seu-ip-vps
```

### 2️⃣ Entrar no diretório do projeto
```bash
cd /opt/leilaoapp
```

### 3️⃣ Atualizar código do GitHub
```bash
git pull origin main
```

### 4️⃣ Instalar dependências (se necessário)
```bash
npm install
```

### 5️⃣ Reiniciar serviço do scrape-server
```bash
pm2 restart scrape-server --update-env
```

### 6️⃣ Verificar status
```bash
pm2 status
pm2 logs scrape-server --lines 50
```

### 7️⃣ (Opcional) Testar scraping manualmente
```bash
pm2 logs scrape-server --lines 100 --follow
# Em outro terminal
curl -X POST http://localhost:4060/run \
  -H "X-Auth-Token: seu_token_aqui" \
  -H "Content-Type: application/json" \
  -d '{"auctioneers": ["superbid-real"]}'
```

---

## 📋 Comandos Úteis da VPS

### Ver todos os processos PM2
```bash
pm2 list
```

### Ver logs em tempo real
```bash
pm2 logs scrape-server --follow
```

### Parar scraping em execução
```bash
pm2 logs scrape-server --follow
# Em outro terminal
curl -X POST http://localhost:4060/stop \
  -H "X-Auth-Token: seu_token_aqui"
```

### Reiniciar todos os serviços
```bash
pm2 restart all --update-env
```

### Ver uso de recursos
```bash
pm2 monit
```

### Salvar configuração atual do PM2
```bash
pm2 save
```

---

## 🔧 Variáveis de Ambiente na VPS

Certifique-se de que estas variáveis estão configuradas no `.env` da VPS:

```env
# Supabase
SUPABASE_URL=https://sua-url.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui
NEXT_PUBLIC_SUPABASE_URL=https://sua-url.supabase.co

# Chrome/Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
CHROME_PATH=/usr/bin/google-chrome-stable

# Scrape Server
SCRAPE_API_PORT=4060
SCRAPE_API_TOKEN=seu_token_seguro_aqui

# Node
NODE_ENV=production

# GitHub Auth (opcional)
GITHUB_PERSONAL_ACCESS_TOKEN=seu_token_github
```

---

## 🐛 Troubleshooting

### Erro: "Module not found"
```bash
cd /opt/leilaoapp
git pull origin main
npm install
pm2 restart scrape-server --update-env
```

### Erro: "Cannot find Chrome"
```bash
which google-chrome-stable
# Se não encontrar
apt-get update && apt-get install -y google-chrome-stable
```

### Erro: "Permission denied"
```bash
# Dar permissão ao PM2
pm2 startup
pm2 save
```

### Verificar logs de erro
```bash
pm2 logs scrape-server --err --lines 100
```

---

## ✅ Checklist de Deploy

- [ ] Conectar na VPS via SSH
- [ ] Ir para diretório `/opt/leilaoapp`
- [ ] Executar `git pull origin main`
- [ ] Executar `npm install` (se houver mudanças em package.json)
- [ ] Verificar variáveis de ambiente no `.env`
- [ ] Reiniciar PM2: `pm2 restart scrape-server --update-env`
- [ ] Verificar status: `pm2 status`
- [ ] Ver logs: `pm2 logs scrape-server --lines 50`
- [ ] Testar scraping via scraping-console no navegador
- [ ] Confirmar que dados estão sendo salvos no Supabase

---

## 🎯 Testando o Scraping Superbid

### Via scraping-console (interface web)
1. Acesse: `https://www.ybybid.com.br/scraping-console`
2. Selecione "Superbid Real"
3. Clique em "Start scraping"
4. Monitore logs em tempo real

### Via API direta (terminal)
```bash
curl -X POST https://www.ybybid.com.br/api/scraping/proxy/run \
  -H "Content-Type: application/json" \
  -d '{"auctioneers": ["superbid-real"]}'
```

### Via VPS direto
```bash
curl -X POST http://localhost:4060/run \
  -H "X-Auth-Token: seu_token_vps" \
  -H "Content-Type: application/json" \
  -d '{"auctioneers": ["superbid-real"]}'
```

---

**Nota:** O token de autenticação está configurado nas variáveis de ambiente da VPS e da Vercel.



