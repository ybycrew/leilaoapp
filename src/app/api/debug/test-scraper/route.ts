import { NextRequest, NextResponse } from 'next/server';
import { SodreSantoroRealScraper } from '@/lib/scraping/scrapers/sodre-santoro-real';

export async function GET(request: NextRequest) {
  try {
    console.log('=== TESTE DIRETO DO SCRAPER ===');
    
    const scraper = new SodreSantoroRealScraper();
    console.log(`Scraper criado: ${scraper.auctioneerName}`);
    
    // Inicializar o scraper
    await scraper.init();
    console.log('Scraper inicializado com sucesso');
    
    // Executar scraping com timeout
    const startTime = Date.now();
    console.log('Iniciando scraping...');
    
    const vehicles = await Promise.race([
      scraper.scrapeVehicles(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout após 5 minutos')), 5 * 60 * 1000)
      )
    ]) as any[];
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`Scraping concluído em ${duration}s`);
    console.log(`Veículos coletados: ${vehicles.length}`);
    
    // Fechar o scraper
    await scraper.close();
    
    return NextResponse.json({
      success: true,
      scraperName: scraper.auctioneerName,
      vehiclesCollected: vehicles.length,
      durationSeconds: duration,
      sampleVehicles: vehicles.slice(0, 3).map(v => ({
        external_id: v.external_id,
        title: v.title,
        brand: v.brand,
        model: v.model,
        auction_date: v.auction_date,
        current_bid: v.current_bid
      }))
    });
  } catch (error: any) {
    console.error('Erro no teste do scraper:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro interno do servidor',
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}
