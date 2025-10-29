#!/usr/bin/env node

/**
 * Script simples para testar o SuperbidHybridScraper
 * Executa diretamente o scraper sem dependências do sistema completo
 */

console.log('🚀 [TEST SIMPLE] Iniciando teste do SuperbidHybridScraper...');
console.log('📅 [TEST SIMPLE] Data:', new Date().toISOString());

// Simular o ambiente necessário
process.env.NODE_ENV = 'production';
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

async function testSuperbid() {
  try {
    console.log('📦 [TEST SIMPLE] Importando scraper...');
    
    // Importar o scraper (assumindo que está compilado)
    const { SuperbidHybridScraper } = await import('./dist/lib/scraping/scrapers/superbid-hybrid.js');
    
    console.log('✅ [TEST SIMPLE] Scraper importado com sucesso');
    
    const scraper = new SuperbidHybridScraper();
    console.log('✅ [TEST SIMPLE] Scraper instanciado');
    
    console.log('🕷️  [TEST SIMPLE] Iniciando scraping...');
    const vehicles = await scraper.run();
    
    console.log('✅ [TEST SIMPLE] Scraping concluído!');
    console.log('📊 [TEST SIMPLE] Veículos encontrados:', vehicles.length);
    
    if (vehicles.length > 0) {
      console.log('🚗 [TEST SIMPLE] Primeiros veículos:');
      vehicles.slice(0, 3).forEach((vehicle, index) => {
        console.log(`  ${index + 1}. ${vehicle.title}`);
        console.log(`     Preço: R$ ${vehicle.current_bid || 'N/A'}`);
        console.log(`     Link: ${vehicle.original_url || 'N/A'}`);
        console.log(`     Imagem: ${vehicle.thumbnail_url || 'N/A'}`);
      });
    } else {
      console.log('❌ [TEST SIMPLE] Nenhum veículo encontrado');
      console.log('🔍 [TEST SIMPLE] Verifique os logs acima para debug');
    }
    
  } catch (error) {
    console.error('❌ [TEST SIMPLE] Erro durante o teste:', error);
    console.error('📋 [TEST SIMPLE] Stack trace:', error.stack);
    
    // Tentar importar diretamente do TypeScript
    try {
      console.log('🔄 [TEST SIMPLE] Tentando importar do TypeScript...');
      const { SuperbidHybridScraper } = await import('./src/lib/scraping/scrapers/superbid-hybrid.ts');
      
      const scraper = new SuperbidHybridScraper();
      const vehicles = await scraper.run();
      
      console.log('✅ [TEST SIMPLE] Scraping via TypeScript concluído!');
      console.log('📊 [TEST SIMPLE] Veículos encontrados:', vehicles.length);
      
    } catch (tsError) {
      console.error('❌ [TEST SIMPLE] Erro com TypeScript:', tsError);
    }
  }
}

testSuperbid();
