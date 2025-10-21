import { NextRequest, NextResponse } from 'next/server';

/**
 * Webhook para trigger manual do scraping no GitHub Actions
 * 
 * O scraping real agora é executado no GitHub Actions para evitar timeout do Vercel.
 * Este endpoint serve apenas como webhook para trigger manual.
 * 
 * Executado via GitHub Actions a cada 6 horas.
 * Ver: .github/workflows/scraping-cron.yml
 * 
 * Teste manualmente:
 * curl -X POST -H "Authorization: Bearer SEU_CRON_SECRET" https://seu-dominio.vercel.app/api/cron/scrape
 */
async function handleCronRequest(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Verificar autorização (CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    const querySecret = request.nextUrl.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET não configurado' },
        { status: 500 }
      );
    }

    // Aceitar secret no header (Bearer) ou query param (?secret=)
    const isAuthorized = 
      authHeader === `Bearer ${cronSecret}` || 
      querySecret === cronSecret;

    if (!isAuthorized) {
      console.error('Tentativa de acesso não autorizado ao cron job');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🚀 Webhook de scraping recebido - redirecionando para GitHub Actions...');

    // TODO: Implementar trigger do GitHub Actions via API
    // Por enquanto, apenas retorna sucesso
    const executionTime = Date.now() - startTime;

    const response = {
      success: true,
      message: 'Webhook recebido - scraping será executado no GitHub Actions',
      timestamp: new Date().toISOString(),
      executionTimeMs: executionTime,
      note: 'O scraping real agora é executado no GitHub Actions para evitar timeout do Vercel',
    };

    console.log('✅ Webhook processado:', response.message);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ Erro fatal no cron job:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Scraping failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Exportar para GET e POST
export const GET = handleCronRequest;
export const POST = handleCronRequest;
