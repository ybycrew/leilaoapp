@echo off
REM ============================================
REM SCRIPT DE INSTALACAO AUTOMATICA - YBYBID
REM Execute este script para instalar o banco completo (Windows)
REM ============================================

setlocal enabledelayedexpansion

echo.
echo ========================================
echo    YbyBid - Instalacao do Banco    
echo ========================================
echo.

REM Verificar se psql esta instalado
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] psql nao encontrado
    echo.
    echo Instale PostgreSQL client:
    echo   Download: https://www.postgresql.org/download/windows/
    echo.
    pause
    exit /b 1
)

echo [OK] psql encontrado
echo.

REM Perguntar informacoes de conexao
echo Configuracao de Conexao:
echo.

set /p DB_HOST="Host do Supabase (ex: db.abc123.supabase.co): "
set /p DB_NAME="Nome do banco [postgres]: "
if "!DB_NAME!"=="" set DB_NAME=postgres
set /p DB_USER="Usuario [postgres]: "
if "!DB_USER!"=="" set DB_USER=postgres
set /p DB_PASSWORD="Senha: "
set /p DB_PORT="Porta [5432]: "
if "!DB_PORT!"=="" set DB_PORT=5432

echo.
echo Opcoes de Instalacao:
echo.
set /p RUN_SEEDS="Executar seeds (dados de teste)? [s/N]: "
if "!RUN_SEEDS!"=="" set RUN_SEEDS=n

echo.
echo -----------------------------------------
echo Configuracao:
echo   Host: !DB_HOST!
echo   Banco: !DB_NAME!
echo   Usuario: !DB_USER!
echo   Porta: !DB_PORT!
echo   Seeds: !RUN_SEEDS!
echo -----------------------------------------
echo.

set /p CONTINUE="Continuar com a instalacao? [S/n]: "
if "!CONTINUE!"=="" set CONTINUE=s

if /i not "!CONTINUE!"=="s" (
    echo Instalacao cancelada
    pause
    exit /b 0
)

echo.
echo ========================================
echo Iniciando instalacao...
echo ========================================
echo.

REM Definir PGPASSWORD
set PGPASSWORD=!DB_PASSWORD!

REM Diretorio do script
set SCRIPT_DIR=%~dp0

REM Verificar se os arquivos existem
if not exist "!SCRIPT_DIR!schema.sql" (
    echo [ERRO] schema.sql nao encontrado em !SCRIPT_DIR!
    pause
    exit /b 1
)

if not exist "!SCRIPT_DIR!queries.sql" (
    echo [ERRO] queries.sql nao encontrado em !SCRIPT_DIR!
    pause
    exit /b 1
)

REM 1. Executar schema.sql
echo.
echo ---------------------------------------
echo 1/4: Instalando Schema Principal
echo ---------------------------------------
echo [INFO] Executando schema.sql...
psql -h !DB_HOST! -p !DB_PORT! -U !DB_USER! -d !DB_NAME! -f "!SCRIPT_DIR!schema.sql" -q
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao executar schema.sql
    pause
    exit /b 1
)
echo [OK] Schema instalado
echo.

REM 2. Executar queries.sql
echo ---------------------------------------
echo 2/4: Instalando Funcoes SQL
echo ---------------------------------------
echo [INFO] Executando queries.sql...
psql -h !DB_HOST! -p !DB_PORT! -U !DB_USER! -d !DB_NAME! -f "!SCRIPT_DIR!queries.sql" -q
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao executar queries.sql
    pause
    exit /b 1
)
echo [OK] Funcoes instaladas
echo.

REM 3. Executar seeds.sql (se solicitado)
if /i "!RUN_SEEDS!"=="s" (
    if exist "!SCRIPT_DIR!seeds.sql" (
        echo ---------------------------------------
        echo 3/4: Inserindo Dados de Teste
        echo ---------------------------------------
        echo [INFO] Executando seeds.sql...
        psql -h !DB_HOST! -p !DB_PORT! -U !DB_USER! -d !DB_NAME! -f "!SCRIPT_DIR!seeds.sql" -q
        if %errorlevel% neq 0 (
            echo [AVISO] Falha ao executar seeds.sql
        ) else (
            echo [OK] Seeds inseridos
        )
        echo.
    ) else (
        echo [AVISO] seeds.sql nao encontrado, pulando...
        echo.
    )
) else (
    echo ---------------------------------------
    echo 3/4: Seeds - Pulado
    echo ---------------------------------------
    echo [INFO] Seeds nao executados (producao)
    echo.
)

REM 4. Verificar instalacao
if exist "!SCRIPT_DIR!verify.sql" (
    echo ---------------------------------------
    echo 4/4: Verificando Instalacao
    echo ---------------------------------------
    psql -h !DB_HOST! -p !DB_PORT! -U !DB_USER! -d !DB_NAME! -f "!SCRIPT_DIR!verify.sql"
    echo.
) else (
    echo ---------------------------------------
    echo 4/4: Verificacao - Pulada
    echo ---------------------------------------
    echo [INFO] verify.sql nao encontrado
    echo.
)

REM Resumo final
echo.
echo ========================================
echo [OK] INSTALACAO CONCLUIDA COM SUCESSO!
echo ========================================
echo.

echo Resumo da Instalacao:
echo.

REM Contar objetos criados
for /f "usebackq delims=" %%i in (`psql -h !DB_HOST! -p !DB_PORT! -U !DB_USER! -d !DB_NAME! -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" 2^>nul`) do set TABLE_COUNT=%%i
set TABLE_COUNT=!TABLE_COUNT: =!
echo   Tabelas criadas: !TABLE_COUNT!

for /f "usebackq delims=" %%i in (`psql -h !DB_HOST! -p !DB_PORT! -U !DB_USER! -d !DB_NAME! -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';" 2^>nul`) do set FUNCTION_COUNT=%%i
set FUNCTION_COUNT=!FUNCTION_COUNT: =!
echo   Funcoes criadas: !FUNCTION_COUNT!

for /f "usebackq delims=" %%i in (`psql -h !DB_HOST! -p !DB_PORT! -U !DB_USER! -d !DB_NAME! -t -c "SELECT COUNT(*) FROM pg_trigger WHERE tgisinternal = false;" 2^>nul`) do set TRIGGER_COUNT=%%i
set TRIGGER_COUNT=!TRIGGER_COUNT: =!
echo   Triggers criados: !TRIGGER_COUNT!

for /f "usebackq delims=" %%i in (`psql -h !DB_HOST! -p !DB_PORT! -U !DB_USER! -d !DB_NAME! -t -c "SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';" 2^>nul`) do set POLICY_COUNT=%%i
set POLICY_COUNT=!POLICY_COUNT: =!
echo   Politicas RLS: !POLICY_COUNT!

for /f "usebackq delims=" %%i in (`psql -h !DB_HOST! -p !DB_PORT! -U !DB_USER! -d !DB_NAME! -t -c "SELECT COUNT(*) FROM plans;" 2^>nul`) do set PLAN_COUNT=%%i
set PLAN_COUNT=!PLAN_COUNT: =!
echo   Planos cadastrados: !PLAN_COUNT!

if /i "!RUN_SEEDS!"=="s" (
    for /f "usebackq delims=" %%i in (`psql -h !DB_HOST! -p !DB_PORT! -U !DB_USER! -d !DB_NAME! -t -c "SELECT COUNT(*) FROM vehicles;" 2^>nul`) do set VEHICLE_COUNT=%%i
    set VEHICLE_COUNT=!VEHICLE_COUNT: =!
    echo   Veiculos de teste: !VEHICLE_COUNT!
)

echo.
echo ========================================
echo.

REM Proximos passos
echo Proximos Passos:
echo.
echo 1. Configure as variaveis de ambiente no .env.local
echo.
echo 2. Configure Supabase no seu projeto
echo.
echo 3. Implemente as APIs usando as funcoes SQL
echo.
echo 4. Consulte README.md para mais detalhes
echo.

REM Salvar informacoes em arquivo (opcional)
set /p SAVE_ENV="Salvar configuracao em .env.local? [s/N]: "
if /i "!SAVE_ENV!"=="s" (
    (
        echo # YbyBid - Database Configuration
        echo # Gerado em: %date% %time%
        echo.
        echo DATABASE_URL="postgresql://!DB_USER!:!DB_PASSWORD!@!DB_HOST!:!DB_PORT!/!DB_NAME!"
        echo.
        echo # Configure estas variaveis com valores do Supabase Dashboard
        echo NEXT_PUBLIC_SUPABASE_URL="https://[seu-projeto].supabase.co"
        echo NEXT_PUBLIC_SUPABASE_ANON_KEY="[sua-chave-anon]"
        echo SUPABASE_SERVICE_ROLE_KEY="[sua-chave-service-role]"
        echo.
        echo # Stripe/Mercado Pago
        echo STRIPE_SECRET_KEY=""
        echo STRIPE_WEBHOOK_SECRET=""
        echo.
        echo # SendGrid/Resend
        echo SENDGRID_API_KEY=""
        echo EMAIL_FROM="noreply@ybybid.com"
        echo.
        echo # Cron Job Secret
        echo CRON_SECRET=""
    ) > .env.local
    echo [OK] Arquivo .env.local criado
    echo.
)

echo ========================================
echo Instalacao finalizada!
echo ========================================
echo.

REM Perguntar se quer abrir documentacao
set /p OPEN_README="Abrir README.md? [S/n]: "
if "!OPEN_README!"=="" set OPEN_README=s

if /i "!OPEN_README!"=="s" (
    if exist "!SCRIPT_DIR!README.md" (
        start "" "!SCRIPT_DIR!README.md"
    )
)

echo.
echo Obrigado por usar YbyBid!
echo.
pause

