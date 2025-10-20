import { NextRequest, NextResponse } from 'next/server';
import { runAllScrapers } from '@/lib/scraping';

/**
 * Rota de Cron Job para executar scraping automatizado
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

    console.log('🚀 Iniciando scraping via cron job...');

    // 2. Executar scraping de todos os leiloeiros
    const results = await runAllScrapers();

    // 3. Calcular estatísticas
    const totalScraped = results.reduce((sum, r) => sum + r.vehiclesScraped, 0);
    const totalCreated = results.reduce((sum, r) => sum + r.vehiclesCreated, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.vehiclesUpdated, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const allSuccess = results.every((r) => r.success);

    const executionTime = Date.now() - startTime;

    // 4. Preparar resposta
    const response = {
      success: allSuccess,
      timestamp: new Date().toISOString(),
      executionTimeMs: executionTime,
      summary: {
        totalAuctioneers: results.length,
        totalScraped,
        totalCreated,
        totalUpdated,
        totalErrors,
      },
      results: results.map((r) => ({
        auctioneer: r.auctioneer,
        success: r.success,
        scraped: r.vehiclesScraped,
        created: r.vehiclesCreated,
        updated: r.vehiclesUpdated,
        errors: r.errors,
        executionTimeMs: r.executionTimeMs,
      })),
    };

    console.log('✅ Scraping concluído:', response.summary);

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
