#!/usr/bin/env tsx

/**
 * Script para executar scraping diretamente no GitHub Actions
 * Acesso direto ao Supabase, sem timeout do Vercel
 */

import { runAllScrapers } from '../src/lib/scraping/index';

async function main() {
  console.log('🚀 Iniciando scraping no GitHub Actions...');
  console.log('====================================');

  try {
    // Verificar variáveis de ambiente (suporte para Vercel e GitHub Actions)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const missingVars = [];
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL');
    if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY ou SUPABASE_ANON_KEY');
    if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
    
    if (missingVars.length > 0) {
      console.error('❌ Variáveis de ambiente obrigatórias não encontradas:');
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      process.exit(1);
    }

    console.log('✅ Variáveis de ambiente configuradas');
    console.log(`   - SUPABASE_URL: ${supabaseUrl ? '✅' : '❌'}`);
    console.log(`   - SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅' : '❌'}`);
    console.log(`   - SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅' : '❌'}`);

    // Executar o scraping
    console.log('====================================');
    console.log('Executando scraping...');
    
    const startTime = Date.now();
    
    // Executar o scraping
    const results = await runAllScrapers();
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    console.log('====================================');
    console.log('✅ Scraping concluído com sucesso!');
    console.log(`⏱️  Tempo de execução: ${Math.round(executionTime / 1000)}s`);
    console.log('====================================');
    
    // Resumo dos resultados
    results.forEach(result => {
      console.log(`${result.success ? '✅' : '❌'} ${result.auctioneer}:`);
      console.log(`   - Veículos coletados: ${result.vehiclesScraped}`);
      console.log(`   - Novos: ${result.vehiclesCreated}`);
      console.log(`   - Atualizados: ${result.vehiclesUpdated}`);
      console.log(`   - Erros: ${result.errors.length}`);
      if (result.errors.length > 0) {
        result.errors.forEach(error => console.log(`     - ${error}`));
      }
    });
    
    console.log('====================================');
    console.log('🎉 Scraping finalizado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante o scraping:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Executar o script
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
