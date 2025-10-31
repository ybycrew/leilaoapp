#!/bin/bash
# Script para atualizar e reiniciar scraping na VPS

cd /opt/leilaoapp

echo "=== Atualizando código do GitHub ==="
git pull origin main

echo "=== Reiniciando serviço scraping-api ==="
pm2 restart scraping-api --update-env

echo "=== Status do serviço ==="
pm2 status

echo "=== Últimos logs (20 linhas) ==="
pm2 logs scraping-api --lines 20 --nostream

echo ""
echo "✅ Atualização concluída!"
echo ""
echo "Para monitorar logs em tempo real:"
echo "  pm2 logs scraping-api --follow"

