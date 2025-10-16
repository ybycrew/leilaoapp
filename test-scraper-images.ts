/**
 * Script de teste do Scraper Sodré Santoro
 * Testa a extração de múltiplas imagens e informações adicionais
 * Limita a 2 páginas (~96 veículos) para teste rápido
 */
import { SodreSantoroScraper } from './src/lib/scraping/scrapers/sodre-santoro';

async function testScraper() {
  console.log('🧪 Iniciando teste do scraper Sodré Santoro...\n');
  
  const scraper = new SodreSantoroScraper();
  
  try {
    console.log('📊 Executando scraping (limitado a primeiras páginas)...\n');
    
    const startTime = Date.now();
    const vehicles = await scraper.run();
    const endTime = Date.now();
    
    console.log('\n✅ Scraping concluído!');
    console.log(`⏱️  Tempo de execução: ${((endTime - startTime) / 1000).toFixed(2)}s`);
    console.log(`📦 Total de veículos coletados: ${vehicles.length}`);
    
    // Analisar veículos com múltiplas imagens
    const vehiclesWithMultipleImages = vehicles.filter(v => v.images && v.images.length > 1);
    const totalImages = vehicles.reduce((sum, v) => sum + (v.images?.length || 0), 0);
    const avgImages = vehicles.length > 0 ? (totalImages / vehicles.length).toFixed(2) : 0;
    
    console.log(`\n📸 Estatísticas de Imagens:`);
    console.log(`   - Veículos com múltiplas imagens: ${vehiclesWithMultipleImages.length}/${vehicles.length}`);
    console.log(`   - Total de imagens coletadas: ${totalImages}`);
    console.log(`   - Média de imagens por veículo: ${avgImages}`);
    
    // Mostrar exemplo de veículo com imagens
    const exampleVehicle = vehicles.find(v => v.images && v.images.length > 3);
    if (exampleVehicle) {
      console.log(`\n📋 Exemplo de veículo com carrossel completo:`);
      console.log(`   Título: ${exampleVehicle.title}`);
      console.log(`   Lance: R$ ${exampleVehicle.current_bid?.toFixed(2) || '0,00'}`);
      console.log(`   Total de imagens: ${exampleVehicle.images?.length}`);
      console.log(`   URLs:`);
      exampleVehicle.images?.slice(0, 5).forEach((img, index) => {
        console.log(`     ${index + 1}. ${img}`);
      });
      if (exampleVehicle.images && exampleVehicle.images.length > 5) {
        console.log(`     ... e mais ${exampleVehicle.images.length - 5} imagens`);
      }
    }
    
    // Verificar lances
    const vehiclesWithBid = vehicles.filter(v => v.current_bid && v.current_bid > 0);
    console.log(`\n💰 Lances:`);
    console.log(`   - Veículos com lance: ${vehiclesWithBid.length}/${vehicles.length}`);
    
    if (vehiclesWithBid.length > 0) {
      const minBid = Math.min(...vehiclesWithBid.map(v => v.current_bid || 0));
      const maxBid = Math.max(...vehiclesWithBid.map(v => v.current_bid || 0));
      console.log(`   - Lance mínimo: R$ ${minBid.toFixed(2)}`);
      console.log(`   - Lance máximo: R$ ${maxBid.toFixed(2)}`);
    }
    
  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error);
  }
}

testScraper();


