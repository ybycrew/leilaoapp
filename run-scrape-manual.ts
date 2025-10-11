/**
 * Script para executar scraping manual do Sodré Santoro
 * 
 * Uso: npx tsx run-scrape-manual.ts
 * 
 * O que faz:
 * - Executa o scraper do Sodré Santoro
 * - Salva veículos automaticamente no Supabase
 * - Calcula deal score de cada veículo
 * - Salva imagens
 * - Registra logs
 */

import { runAllScrapers } from './src/lib/scraping';

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║     🚀 SCRAPING MANUAL - SODRÉ SANTORO                      ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const startTime = Date.now();
  
  try {
    console.log('📍 Conectando ao Supabase...');
    console.log('🌐 Iniciando navegador Puppeteer...');
    console.log('🔍 Começando coleta de dados...\n');
    
    // Executar scraping de todos os leiloeiros (atualmente apenas Sodré Santoro)
    const results = await runAllScrapers();
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                                                              ║');
    console.log('║     ✅ SCRAPING CONCLUÍDO COM SUCESSO!                      ║');
    console.log('║                                                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    console.log('📊 RESUMO GERAL:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const totalScraped = results.reduce((sum, r) => sum + r.vehiclesScraped, 0);
    const totalCreated = results.reduce((sum, r) => sum + r.vehiclesCreated, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.vehiclesUpdated, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    
    console.log(`⏱️  Tempo total: ${totalTime}s`);
    console.log(`📦 Total de veículos coletados: ${totalScraped}`);
    console.log(`✨ Novos veículos no banco: ${totalCreated}`);
    console.log(`🔄 Veículos atualizados: ${totalUpdated}`);
    console.log(`❌ Erros: ${totalErrors}\n`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Detalhes por leiloeiro
    results.forEach(result => {
      const statusIcon = result.success ? '✅' : '❌';
      const statusText = result.success ? 'SUCESSO' : 'FALHA';
      
      console.log(`${statusIcon} ${result.auctioneer.toUpperCase()} - ${statusText}`);
      console.log(`   📊 Veículos coletados: ${result.vehiclesScraped}`);
      console.log(`   ✨ Novos no banco: ${result.vehiclesCreated}`);
      console.log(`   🔄 Atualizados: ${result.vehiclesUpdated}`);
      console.log(`   ⏱️  Tempo: ${(result.executionTimeMs / 1000).toFixed(2)}s`);
      
      if (result.errors.length > 0) {
        console.log(`   ❌ Erros encontrados (${result.errors.length}):`);
        result.errors.slice(0, 5).forEach(err => {
          console.log(`      • ${err.substring(0, 80)}${err.length > 80 ? '...' : ''}`);
        });
        if (result.errors.length > 5) {
          console.log(`      ... e mais ${result.errors.length - 5} erros`);
        }
      }
      console.log('');
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (totalCreated > 0 || totalUpdated > 0) {
      console.log('🎉 PRÓXIMOS PASSOS:\n');
      console.log('1️⃣  Inicie o servidor: npm run dev');
      console.log('2️⃣  Acesse a busca: http://localhost:3000/buscar');
      console.log('3️⃣  Veja os veículos no Supabase Dashboard\n');
    }
    
    console.log('✨ Scraping finalizado com sucesso!\n');
    
    process.exit(0);
    
  } catch (error: any) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.error('\n╔══════════════════════════════════════════════════════════════╗');
    console.error('║                                                              ║');
    console.error('║     ❌ ERRO FATAL NO SCRAPING                               ║');
    console.error('║                                                              ║');
    console.error('╚══════════════════════════════════════════════════════════════╝\n');
    
    console.error('⏱️  Tempo decorrido:', totalTime + 's');
    console.error('❌ Erro:', error.message);
    console.error('\n📝 Stack trace:');
    console.error(error.stack);
    
    console.error('\n🔧 POSSÍVEIS SOLUÇÕES:\n');
    console.error('1. Verifique se as variáveis de ambiente estão configuradas:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY\n');
    console.error('2. Verifique se o Supabase está acessível');
    console.error('3. Verifique se a tabela "auctioneers" tem o registro "Sodré Santoro"');
    console.error('4. Verifique sua conexão com a internet\n');
    
    process.exit(1);
  }
}

// Executar
main();

