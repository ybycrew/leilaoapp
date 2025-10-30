import { NextRequest, NextResponse } from 'next/server';
import { SuperbidRealScraper } from '@/lib/scraping/scrapers/superbid-real';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 [TEST SUPERBID] Iniciando teste do scraper híbrido...');
    
    const scraper = new SuperbidRealScraper();
    
    const vehicles = await scraper.run();
    
    console.log(`✅ [TEST SUPERBID] Scraping concluído! ${vehicles.length} veículos encontrados`);
    
    return NextResponse.json({
      success: true,
      message: `Scraping concluído com sucesso! ${vehicles.length} veículos encontrados`,
      vehicleCount: vehicles.length,
      vehicles: vehicles.slice(0, 5), // Mostrar apenas os primeiros 5
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TEST SUPERBID] Erro durante o teste:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro durante o teste do scraper',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
