import { NextRequest, NextResponse } from 'next/server';
import { SodreSantoroRealScraper } from '@/lib/scraping/scrapers/sodre-santoro-real';

export async function GET(request: NextRequest) {
  try {
    const scraper = new SodreSantoroRealScraper();
    
    return NextResponse.json({
      success: true,
      scraperName: scraper.auctioneerName,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      features: [
        'Real IDs extraction',
        'Future auction date filtering',
        'Specific selectors for Sodré Santoro',
        'Detailed logging'
      ]
    });
  } catch (error: any) {
    console.error('Erro no endpoint de debug do scraper:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
