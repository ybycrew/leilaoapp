/**
 * Script para testar o SuperbidHybridScraper localmente
 * Executa o scraper e mostra logs detalhados
 */

console.log('🚀 [DEBUG LOCAL] Iniciando debug do SuperbidHybridScraper...');
console.log('📅 [DEBUG LOCAL] Data:', new Date().toISOString());

// Simular o ambiente necessário
process.env.NODE_ENV = 'production';

async function debugSuperbid() {
  try {
    console.log('📦 [DEBUG LOCAL] Importando scraper...');
    
    // Importar o scraper diretamente
    const { SuperbidHybridScraper } = await import('./src/lib/scraping/scrapers/superbid-hybrid.ts');
    
    console.log('✅ [DEBUG LOCAL] Scraper importado com sucesso');
    
    const scraper = new SuperbidHybridScraper();
    console.log('✅ [DEBUG LOCAL] Scraper instanciado');
    
    console.log('🕷️  [DEBUG LOCAL] Iniciando scraping...');
    console.log('🔍 [DEBUG LOCAL] Aguarde, isso pode levar alguns minutos...');
    
    const startTime = Date.now();
    const vehicles = await scraper.run();
    const endTime = Date.now();
    
    console.log('✅ [DEBUG LOCAL] Scraping concluído!');
    console.log('📊 [DEBUG LOCAL] Veículos encontrados:', vehicles.length);
    console.log('⏱️  [DEBUG LOCAL] Tempo de execução:', (endTime - startTime) + 'ms');
    
    if (vehicles.length > 0) {
      console.log('🚗 [DEBUG LOCAL] Primeiros veículos:');
      vehicles.slice(0, 3).forEach((vehicle, index) => {
        console.log(`  ${index + 1}. ${vehicle.title}`);
        console.log(`     Preço: R$ ${vehicle.current_bid || 'N/A'}`);
        console.log(`     Link: ${vehicle.original_url || 'N/A'}`);
        console.log(`     Imagem: ${vehicle.thumbnail_url || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('❌ [DEBUG LOCAL] Nenhum veículo encontrado');
      console.log('🔍 [DEBUG LOCAL] Verifique os logs acima para debug');
    }
    
  } catch (error) {
    console.error('❌ [DEBUG LOCAL] Erro durante o debug:', error);
    console.error('📋 [DEBUG LOCAL] Stack trace:', error.stack);
  }
}

debugSuperbid();
