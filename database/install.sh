#!/bin/bash

# ============================================
# SCRIPT DE INSTALAÇÃO AUTOMÁTICA - LEILAOMAX
# Execute este script para instalar o banco completo
# ============================================

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo ""
echo "╔════════════════════════════════════════╗"
echo "║   LeilãoMax - Instalação do Banco     ║"
echo "╔════════════════════════════════════════╗"
echo ""

# Verificar se psql está instalado
if ! command -v psql &> /dev/null; then
    echo -e "${RED}✗ ERRO: psql não encontrado${NC}"
    echo "Instale PostgreSQL client:"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo "  Mac: brew install postgresql"
    echo "  Windows: Baixe de postgresql.org"
    exit 1
fi

echo -e "${GREEN}✓ psql encontrado${NC}"
echo ""

# Perguntar informações de conexão
echo -e "${BLUE}Configuração de Conexão:${NC}"
echo ""

read -p "Host do Supabase (ex: db.abc123.supabase.co): " DB_HOST
read -p "Nome do banco [postgres]: " DB_NAME
DB_NAME=${DB_NAME:-postgres}
read -p "Usuário [postgres]: " DB_USER
DB_USER=${DB_USER:-postgres}
read -sp "Senha: " DB_PASSWORD
echo ""
read -p "Porta [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

echo ""
echo -e "${BLUE}Opções de Instalação:${NC}"
echo ""
read -p "Executar seeds (dados de teste)? [s/N]: " RUN_SEEDS
RUN_SEEDS=${RUN_SEEDS:-n}

echo ""
echo "─────────────────────────────────────────"
echo -e "${YELLOW}Configuração:${NC}"
echo "  Host: $DB_HOST"
echo "  Banco: $DB_NAME"
echo "  Usuário: $DB_USER"
echo "  Porta: $DB_PORT"
echo "  Seeds: $([ "$RUN_SEEDS" = "s" ] && echo 'Sim' || echo 'Não')"
echo "─────────────────────────────────────────"
echo ""

read -p "Continuar com a instalação? [S/n]: " CONTINUE
CONTINUE=${CONTINUE:-s}

if [ "$CONTINUE" != "s" ] && [ "$CONTINUE" != "S" ]; then
    echo -e "${RED}Instalação cancelada${NC}"
    exit 0
fi

# String de conexão
CONNECTION_STRING="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

echo ""
echo "════════════════════════════════════════"
echo "Iniciando instalação..."
echo "════════════════════════════════════════"
echo ""

# Função para executar SQL
execute_sql() {
    local file=$1
    local description=$2
    
    echo -e "${BLUE}▶ Executando: $description${NC}"
    
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$file" -q; then
        echo -e "${GREEN}✓ $description - Concluído${NC}"
        return 0
    else
        echo -e "${RED}✗ $description - ERRO${NC}"
        return 1
    fi
}

# Verificar se os arquivos existem
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$SCRIPT_DIR/schema.sql" ]; then
    echo -e "${RED}✗ ERRO: schema.sql não encontrado em $SCRIPT_DIR${NC}"
    exit 1
fi

if [ ! -f "$SCRIPT_DIR/queries.sql" ]; then
    echo -e "${RED}✗ ERRO: queries.sql não encontrado em $SCRIPT_DIR${NC}"
    exit 1
fi

# 1. Executar schema.sql
echo ""
echo "───────────────────────────────────────"
echo "1/4: Instalando Schema Principal"
echo "───────────────────────────────────────"
execute_sql "$SCRIPT_DIR/schema.sql" "Schema (tabelas, triggers, RLS)"
echo ""

# 2. Executar queries.sql
echo "───────────────────────────────────────"
echo "2/4: Instalando Funções SQL"
echo "───────────────────────────────────────"
execute_sql "$SCRIPT_DIR/queries.sql" "Queries (funções auxiliares)"
echo ""

# 3. Executar seeds.sql (se solicitado)
if [ "$RUN_SEEDS" = "s" ] || [ "$RUN_SEEDS" = "S" ]; then
    if [ -f "$SCRIPT_DIR/seeds.sql" ]; then
        echo "───────────────────────────────────────"
        echo "3/4: Inserindo Dados de Teste"
        echo "───────────────────────────────────────"
        execute_sql "$SCRIPT_DIR/seeds.sql" "Seeds (dados de teste)"
        echo ""
    else
        echo -e "${YELLOW}⚠ seeds.sql não encontrado, pulando...${NC}"
        echo ""
    fi
else
    echo "───────────────────────────────────────"
    echo "3/4: Seeds - Pulado"
    echo "───────────────────────────────────────"
    echo -e "${YELLOW}ℹ Seeds não executados (produção)${NC}"
    echo ""
fi

# 4. Verificar instalação
if [ -f "$SCRIPT_DIR/verify.sql" ]; then
    echo "───────────────────────────────────────"
    echo "4/4: Verificando Instalação"
    echo "───────────────────────────────────────"
    
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SCRIPT_DIR/verify.sql"
    echo ""
else
    echo "───────────────────────────────────────"
    echo "4/4: Verificação - Pulada"
    echo "───────────────────────────────────────"
    echo -e "${YELLOW}ℹ verify.sql não encontrado${NC}"
    echo ""
fi

# Resumo final
echo ""
echo "════════════════════════════════════════"
echo -e "${GREEN}✓ INSTALAÇÃO CONCLUÍDA COM SUCESSO!${NC}"
echo "════════════════════════════════════════"
echo ""

# Contar objetos criados
echo "Resumo da Instalação:"
echo ""

# Tabelas
TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null | tr -d ' ')
echo -e "  Tabelas criadas: ${GREEN}$TABLE_COUNT${NC}"

# Funções
FUNCTION_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';" 2>/dev/null | tr -d ' ')
echo -e "  Funções criadas: ${GREEN}$FUNCTION_COUNT${NC}"

# Triggers
TRIGGER_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_trigger WHERE tgisinternal = false;" 2>/dev/null | tr -d ' ')
echo -e "  Triggers criados: ${GREEN}$TRIGGER_COUNT${NC}"

# Políticas RLS
POLICY_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';" 2>/dev/null | tr -d ' ')
echo -e "  Políticas RLS: ${GREEN}$POLICY_COUNT${NC}"

# Planos
PLAN_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM plans;" 2>/dev/null | tr -d ' ')
echo -e "  Planos cadastrados: ${GREEN}$PLAN_COUNT${NC}"

if [ "$RUN_SEEDS" = "s" ] || [ "$RUN_SEEDS" = "S" ]; then
    VEHICLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM vehicles;" 2>/dev/null | tr -d ' ')
    echo -e "  Veículos de teste: ${GREEN}$VEHICLE_COUNT${NC}"
fi

echo ""
echo "════════════════════════════════════════"
echo ""

# Próximos passos
echo -e "${BLUE}📝 Próximos Passos:${NC}"
echo ""
echo "1. Configure as variáveis de ambiente:"
echo "   DATABASE_URL=\"$CONNECTION_STRING\""
echo ""
echo "2. Configure Supabase no seu projeto:"
echo "   NEXT_PUBLIC_SUPABASE_URL=\"https://[seu-projeto].supabase.co\""
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=\"[sua-chave-anon]\""
echo ""
echo "3. Implemente as APIs usando as funções SQL"
echo ""
echo "4. Configure Supabase Auth no frontend"
echo ""
echo "5. Consulte README.md para mais detalhes"
echo ""

# Salvar informações em arquivo (opcional)
read -p "Salvar configuração em .env.local? [s/N]: " SAVE_ENV
if [ "$SAVE_ENV" = "s" ] || [ "$SAVE_ENV" = "S" ]; then
    cat > .env.local << EOF
# LeilãoMax - Database Configuration
# Gerado em: $(date)

DATABASE_URL="$CONNECTION_STRING"

# Configure estas variáveis com valores do Supabase Dashboard
NEXT_PUBLIC_SUPABASE_URL="https://[seu-projeto].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[sua-chave-anon]"
SUPABASE_SERVICE_ROLE_KEY="[sua-chave-service-role]"

# Stripe/Mercado Pago (para pagamentos)
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# SendGrid/Resend (para emails)
SENDGRID_API_KEY=""
EMAIL_FROM="noreply@leilaomax.com"

# Cron Job Secret
CRON_SECRET="$(openssl rand -hex 32)"
EOF
    echo -e "${GREEN}✓ Arquivo .env.local criado${NC}"
    echo ""
fi

echo "════════════════════════════════════════"
echo -e "${GREEN}Instalação finalizada! 🎉${NC}"
echo "════════════════════════════════════════"
echo ""

# Perguntar se quer abrir documentação
read -p "Abrir README.md? [S/n]: " OPEN_README
OPEN_README=${OPEN_README:-s}

if [ "$OPEN_README" = "s" ] || [ "$OPEN_README" = "S" ]; then
    if [ -f "$SCRIPT_DIR/README.md" ]; then
        if command -v xdg-open &> /dev/null; then
            xdg-open "$SCRIPT_DIR/README.md"
        elif command -v open &> /dev/null; then
            open "$SCRIPT_DIR/README.md"
        else
            echo "Abra manualmente: $SCRIPT_DIR/README.md"
        fi
    fi
fi

echo ""
echo "Obrigado por usar LeilãoMax! 🚀"
echo ""

