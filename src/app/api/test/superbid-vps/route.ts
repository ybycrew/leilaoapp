import { NextRequest, NextResponse } from 'next/server';
import { SuperbidSPAScraper } from '@/lib/scraping/scrapers/superbid-spa';

export async function GET(request: NextRequest) {
  console.log('🧪 [TEST VPS] Iniciando teste do SuperbidHybridScraper na VPS...');
  console.log('📅 [TEST VPS] Data:', new Date().toISOString());
  console.log('🖥️  [TEST VPS] Node.js version:', process.version);
  console.log('🌍 [TEST VPS] NODE_ENV:', process.env.NODE_ENV);
  console.log('🔧 [TEST VPS] VERCEL:', process.env.VERCEL);
  console.log('🔧 [TEST VPS] GITHUB_ACTIONS:', process.env.GITHUB_ACTIONS);
  
  try {
    console.log('📦 [TEST VPS] Criando instância do scraper...');
    const scraper = new SuperbidSPAScraper();
    
    console.log('✅ [TEST VPS] Scraper criado com sucesso');
    console.log('🕷️  [TEST VPS] Iniciando scraping...');
    
    const startTime = Date.now();
    const vehicles = await scraper.run();
    const endTime = Date.now();
    
    const executionTime = endTime - startTime;
    
    console.log('✅ [TEST VPS] Scraping concluído!');
    console.log('📊 [TEST VPS] Veículos encontrados:', vehicles.length);
    console.log('⏱️  [TEST VPS] Tempo de execução:', executionTime + 'ms');
    
    if (vehicles.length > 0) {
      console.log('🚗 [TEST VPS] Primeiros veículos:');
      vehicles.slice(0, 3).forEach((vehicle, index) => {
        console.log(`  ${index + 1}. ${vehicle.title}`);
        console.log(`     Preço: R$ ${vehicle.current_bid || 'N/A'}`);
        console.log(`     Link: ${vehicle.original_url || 'N/A'}`);
        console.log(`     Imagem: ${vehicle.thumbnail_url || 'N/A'}`);
      });
    } else {
      console.log('❌ [TEST VPS] Nenhum veículo encontrado');
      console.log('🔍 [TEST VPS] Verifique os logs acima para debug');
    }
    
    return NextResponse.json({
      success: true,
      message: `Teste VPS concluído! ${vehicles.length} veículos encontrados`,
      vehicleCount: vehicles.length,
      executionTimeMs: executionTime,
      vehicles: vehicles.slice(0, 5), // Mostrar apenas os primeiros 5
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL,
        isGitHubActions: !!process.env.GITHUB_ACTIONS,
        isVPS: !process.env.VERCEL && !process.env.GITHUB_ACTIONS && process.env.NODE_ENV === 'production'
      }
    });
    
  } catch (error) {
    console.error('❌ [TEST VPS] Erro durante o teste:', error);
    console.error('📋 [TEST VPS] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    
    return NextResponse.json({
      success: false,
      message: 'Erro durante o teste do scraper na VPS',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL,
        isGitHubActions: !!process.env.GITHUB_ACTIONS,
        isVPS: !process.env.VERCEL && !process.env.GITHUB_ACTIONS && process.env.NODE_ENV === 'production'
      }
    }, { status: 500 });
  }
}
