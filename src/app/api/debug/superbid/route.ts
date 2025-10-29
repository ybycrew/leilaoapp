import { NextRequest, NextResponse } from 'next/server';
import { SuperbidHybridScraper } from '@/lib/scraping/scrapers/superbid-hybrid';

export async function GET(request: NextRequest) {
  const logs: string[] = [];
  
  // Função para capturar logs
  const originalLog = console.log;
  const originalError = console.error;
  
  console.log = (...args) => {
    logs.push(`[LOG] ${args.join(' ')}`);
    originalLog(...args);
  };
  
  console.error = (...args) => {
    logs.push(`[ERROR] ${args.join(' ')}`);
    originalError(...args);
  };

  try {
    logs.push(`[DEBUG] Iniciando debug do SuperbidHybridScraper...`);
    logs.push(`[DEBUG] Data: ${new Date().toISOString()}`);
    logs.push(`[DEBUG] Node.js version: ${process.version}`);
    logs.push(`[DEBUG] NODE_ENV: ${process.env.NODE_ENV}`);
    
    const scraper = new SuperbidHybridScraper();
    logs.push(`[DEBUG] Scraper criado com sucesso`);
    
    const startTime = Date.now();
    const vehicles = await scraper.run();
    const endTime = Date.now();
    
    logs.push(`[DEBUG] Scraping concluído em ${endTime - startTime}ms`);
    logs.push(`[DEBUG] Veículos encontrados: ${vehicles.length}`);
    
    if (vehicles.length > 0) {
      logs.push(`[DEBUG] Primeiros veículos:`);
      vehicles.slice(0, 3).forEach((vehicle, index) => {
        logs.push(`  ${index + 1}. ${vehicle.title}`);
        logs.push(`     Preço: R$ ${vehicle.current_bid || 'N/A'}`);
        logs.push(`     Link: ${vehicle.original_url || 'N/A'}`);
      });
    } else {
      logs.push(`[DEBUG] Nenhum veículo encontrado`);
    }
    
    // Restaurar console original
    console.log = originalLog;
    console.error = originalError;
    
    return NextResponse.json({
      success: true,
      message: `Debug concluído! ${vehicles.length} veículos encontrados`,
      vehicleCount: vehicles.length,
      executionTimeMs: endTime - startTime,
      vehicles: vehicles.slice(0, 5),
      logs: logs,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logs.push(`[ERROR] Erro durante o debug: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    logs.push(`[ERROR] Stack trace: ${error instanceof Error ? error.stack : 'N/A'}`);
    
    // Restaurar console original
    console.log = originalLog;
    console.error = originalError;
    
    return NextResponse.json({
      success: false,
      message: 'Erro durante o debug',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      logs: logs,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
