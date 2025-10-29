#!/usr/bin/env node

/**
 * Script para testar o SuperbidHybridScraper diretamente na VPS
 * 
 * Uso:
 * node test-superbid-vps.js
 * 
 * Este script executa o scraper com logs detalhados para debug
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 [TEST VPS] Iniciando teste do SuperbidHybridScraper...');
console.log('📅 [TEST VPS] Data:', new Date().toISOString());
console.log('🖥️  [TEST VPS] Node.js version:', process.version);
console.log('📁 [TEST VPS] Diretório:', process.cwd());

try {
  // Verificar se o arquivo existe
  const scraperPath = path.join(__dirname, 'src/lib/scraping/scrapers/superbid-hybrid.ts');
  console.log('📄 [TEST VPS] Verificando arquivo:', scraperPath);
  
  // Executar o scraper via ts-node ou compilar primeiro
  console.log('🔧 [TEST VPS] Executando scraper...');
  
  // Criar um script temporário para testar
  const testScript = `
import { SuperbidHybridScraper } from './src/lib/scraping/scrapers/superbid-hybrid.js';

async function testSuperbid() {
  console.log('🧪 [TEST] Iniciando teste do SuperbidHybridScraper...');
  
  try {
    const scraper = new SuperbidHybridScraper();
    console.log('✅ [TEST] Scraper criado com sucesso');
    
    const vehicles = await scraper.run();
    console.log('✅ [TEST] Scraping concluído!');
    console.log('📊 [TEST] Veículos encontrados:', vehicles.length);
    
    if (vehicles.length > 0) {
      console.log('🚗 [TEST] Primeiros veículos:');
      vehicles.slice(0, 3).forEach((vehicle, index) => {
        console.log(\`  \${index + 1}. \${vehicle.title}\`);
        console.log(\`     Preço: R$ \${vehicle.current_bid || 'N/A'}\`);
        console.log(\`     Link: \${vehicle.original_url || 'N/A'}\`);
      });
    } else {
      console.log('❌ [TEST] Nenhum veículo encontrado');
    }
    
  } catch (error) {
    console.error('❌ [TEST] Erro durante o teste:', error);
    console.error('📋 [TEST] Stack trace:', error.stack);
  }
}

testSuperbid();
`;

  // Salvar script temporário
  const fs = require('fs');
  fs.writeFileSync('test-superbid-temp.js', testScript);
  
  console.log('📝 [TEST VPS] Script temporário criado');
  console.log('🚀 [TEST VPS] Executando teste...');
  
  // Executar o teste
  execSync('node test-superbid-temp.js', { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  
  // Limpar arquivo temporário
  fs.unlinkSync('test-superbid-temp.js');
  
  console.log('✅ [TEST VPS] Teste concluído!');
  
} catch (error) {
  console.error('❌ [TEST VPS] Erro durante o teste:', error);
  console.error('📋 [TEST VPS] Stack trace:', error.stack);
  process.exit(1);
}
