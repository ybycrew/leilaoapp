/**
 * Script de teste para o scraper do Sodré Santoro
 * 
 * Como usar:
 * npx tsx test-scraper.ts
 */

import { SodreSantoroScraper } from './src/lib/scraping/scrapers/sodre-santoro';

async function testScraper() {
  console.log('🚀 Iniciando teste do scraper Sodré Santoro...\n');

  const scraper = new SodreSantoroScraper();

  try {
    // Executar scraping
    const vehicles = await scraper.run();

    console.log('\n✅ Scraping concluído com sucesso!\n');
    console.log(`📊 Total de veículos encontrados: ${vehicles.length}\n`);

    // Mostrar os primeiros 5 veículos como exemplo
    console.log('📋 Primeiros 5 veículos:\n');
    vehicles.slice(0, 5).forEach((vehicle, index) => {
      console.log(`${index + 1}. ${vehicle.title}`);
      console.log(`   Marca: ${vehicle.brand} | Modelo: ${vehicle.model}`);
      console.log(`   Preço: R$ ${vehicle.current_bid?.toLocaleString('pt-BR') || 'N/A'}`);
      console.log(`   Localização: ${vehicle.city}/${vehicle.state}`);
      console.log(`   KM: ${vehicle.mileage?.toLocaleString('pt-BR') || 'N/A'}`);
      console.log(`   URL: ${vehicle.original_url}`);
      console.log('');
    });

    // Estatísticas
    console.log('📈 Estatísticas:');
    const withPrice = vehicles.filter(v => v.current_bid).length;
    const withLocation = vehicles.filter(v => v.state && v.city).length;
    const withMileage = vehicles.filter(v => v.mileage).length;
    
    console.log(`   - Veículos com preço: ${withPrice} (${((withPrice / vehicles.length) * 100).toFixed(1)}%)`);
    console.log(`   - Veículos com localização: ${withLocation} (${((withLocation / vehicles.length) * 100).toFixed(1)}%)`);
    console.log(`   - Veículos com quilometragem: ${withMileage} (${((withMileage / vehicles.length) * 100).toFixed(1)}%)`);

    // Salvar em JSON (opcional)
    const fs = require('fs');
    fs.writeFileSync('scraped-vehicles.json', JSON.stringify(vehicles, null, 2));
    console.log('\n💾 Dados salvos em: scraped-vehicles.json');

  } catch (error) {
    console.error('❌ Erro ao executar scraper:', error);
    process.exit(1);
  }
}

// Executar teste
testScraper();

