#!/usr/bin/env tsx

/**
 * Script de Teste e Validação da Nova Classificação de Veículos
 * 
 * Testa a nova classificação baseada em FIPE com casos problemáticos conhecidos:
 * - Carros classificados incorretamente como caminhões (UNO, C-180, MUSTANG, etc.)
 * - Motos classificadas incorretamente como carros
 * - Marcas duais (Honda, Suzuki, Volvo) que fabricam carros e motos
 */

import { createClient } from '@supabase/supabase-js';
import { findVehicleTypeInFipe, mapFipeTypeToVehicleType } from '../lib/vehicle-normalization';
import { normalizeVehicleTypeForDB } from '../lib/scraping/utils';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

interface TestCase {
  title: string;
  brand: string | null;
  model: string | null;
  expectedType: 'carro' | 'moto' | 'caminhao' | 'van';
  description: string;
}

const testCases: TestCase[] = [
  // Casos problemáticos conhecidos - Carros classificados como caminhões
  {
    title: 'FIAT PALIO 1.0',
    brand: 'Fiat',
    model: 'Palio',
    expectedType: 'carro',
    description: 'Palio é sempre carro, não caminhão'
  },
  {
    title: 'FIAT BRAVO ESSENCE',
    brand: 'Fiat',
    model: 'Bravo',
    expectedType: 'carro',
    description: 'Bravo é sempre carro, não caminhão'
  },
  {
    title: 'FORD FOCUS 2.0',
    brand: 'Ford',
    model: 'Focus',
    expectedType: 'carro',
    description: 'Focus é sempre carro, não caminhão'
  },
  {
    title: 'FORD FIESTA 1.6',
    brand: 'Ford',
    model: 'Fiesta',
    expectedType: 'carro',
    description: 'Fiesta é sempre carro, não caminhão'
  },
  {
    title: 'FORD FIESTA TITANIUM',
    brand: 'Ford',
    model: 'Fiesta',
    expectedType: 'carro',
    description: 'Fiesta Titanium é carro, não moto (problema com palavra "titan")'
  },
  {
    title: 'FORD FOCUS TITANIUM',
    brand: 'Ford',
    model: 'Focus',
    expectedType: 'carro',
    description: 'Focus Titanium é carro, não moto'
  },
  {
    title: 'MERCEDES C-180',
    brand: 'Mercedes-Benz',
    model: 'C-180',
    expectedType: 'carro',
    description: 'Mercedes C-180 é carro, não caminhão (problema com marca Mercedes)'
  },
  {
    title: 'MERCEDES C-200',
    brand: 'Mercedes-Benz',
    model: 'C-200',
    expectedType: 'carro',
    description: 'Mercedes C-200 é carro, não caminhão'
  },
  {
    title: 'FORD MUSTANG',
    brand: 'Ford',
    model: 'Mustang',
    expectedType: 'carro',
    description: 'Mustang é carro, não caminhão'
  },
  {
    title: 'FORD ECOSPORT',
    brand: 'Ford',
    model: 'EcoSport',
    expectedType: 'carro',
    description: 'EcoSport é carro, não caminhão'
  },
  {
    title: 'FIAT UNO',
    brand: 'Fiat',
    model: 'Uno',
    expectedType: 'carro',
    description: 'Uno é sempre carro, não caminhão'
  },
  {
    title: 'FIAT UNO VIVACE',
    brand: 'Fiat',
    model: 'Uno',
    expectedType: 'carro',
    description: 'Uno Vivace é carro, não caminhão'
  },
  {
    title: 'VOLVO XC60',
    brand: 'Volvo',
    model: 'XC60',
    expectedType: 'carro',
    description: 'Volvo XC60 é carro, não caminhão (problema com marca Volvo)'
  },
  
  // Casos de marcas duais - Honda
  {
    title: 'HONDA CIVIC',
    brand: 'Honda',
    model: 'Civic',
    expectedType: 'carro',
    description: 'Honda Civic é carro (marca dual - também fabrica motos)'
  },
  {
    title: 'HONDA CB 300',
    brand: 'Honda',
    model: 'CB 300',
    expectedType: 'moto',
    description: 'Honda CB 300 é moto (marca dual - também fabrica carros)'
  },
  {
    title: 'HONDA CG 125',
    brand: 'Honda',
    model: 'CG 125',
    expectedType: 'moto',
    description: 'Honda CG 125 é moto'
  },
  {
    title: 'HONDA TITAN 150',
    brand: 'Honda',
    model: 'Titan 150',
    expectedType: 'moto',
    description: 'Honda Titan 150 é moto (não confundir com Ford Titanium)'
  },
  
  // Casos de motos classificadas incorretamente como carros
  {
    title: 'HONDA BIZ 125',
    brand: 'Honda',
    model: 'Biz 125',
    expectedType: 'moto',
    description: 'Biz 125 é moto, não carro'
  },
  {
    title: 'HONDA CG 125 TITAN-KSE',
    brand: 'Honda',
    model: 'CG 125',
    expectedType: 'moto',
    description: 'CG 125 é moto, não carro'
  },
  
  // Casos de caminhões reais (devem permanecer como caminhão)
  {
    title: 'SCANIA R440',
    brand: 'Scania',
    model: 'R440',
    expectedType: 'caminhao',
    description: 'Scania R440 é caminhão (deve permanecer correto)'
  },
  {
    title: 'VOLKSWAGEN 24.250',
    brand: 'Volkswagen',
    model: '24.250',
    expectedType: 'caminhao',
    description: 'Volkswagen 24.250 é caminhão'
  },
  {
    title: 'MERCEDES ACTROS',
    brand: 'Mercedes-Benz',
    model: 'Actros',
    expectedType: 'caminhao',
    description: 'Mercedes Actros é caminhão (modelo específico de caminhão)'
  },
  {
    title: 'VOLVO FH',
    brand: 'Volvo',
    model: 'FH',
    expectedType: 'caminhao',
    description: 'Volvo FH é caminhão (modelo específico de caminhão)'
  },
  
  // Casos de caminhonetes (devem ser carros)
  {
    title: 'FORD RANGER',
    brand: 'Ford',
    model: 'Ranger',
    expectedType: 'carro',
    description: 'Ford Ranger civil é caminhonete (carro), não caminhão'
  },
  {
    title: 'CHEVROLET S10',
    brand: 'Chevrolet',
    model: 'S10',
    expectedType: 'carro',
    description: 'S10 é caminhonete (carro), não caminhão'
  },
  {
    title: 'TOYOTA HILUX',
    brand: 'Toyota',
    model: 'Hilux',
    expectedType: 'carro',
    description: 'Hilux é caminhonete (carro), não caminhão'
  }
];

interface TestResult {
  testCase: TestCase;
  result: {
    type: string | null;
    normalizedBrand: string | null;
    normalizedModel: string | null;
    isValid: boolean;
  };
  success: boolean;
  error?: string;
}

async function runTests() {
  console.log('🧪 Iniciando testes de validação da nova classificação...\n');
  console.log(`📋 Total de casos de teste: ${testCases.length}\n`);

  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n[${i + 1}/${testCases.length}] Testando: ${testCase.title}`);
    console.log(`   Esperado: ${testCase.expectedType}`);
    console.log(`   Descrição: ${testCase.description}`);

    try {
      const result = await findVehicleTypeInFipe(testCase.brand, testCase.model);
      const normalizedType = result.type ? mapFipeTypeToVehicleType(result.type) : null;
      const finalType = normalizedType ? normalizeVehicleTypeForDB(normalizedType) : null;

      const success = finalType === testCase.expectedType;

      if (success) {
        console.log(`   ✅ PASSOU: Tipo classificado corretamente como "${finalType}"`);
        passed++;
      } else {
        console.log(`   ❌ FALHOU: Esperado "${testCase.expectedType}", obtido "${finalType || 'null'}"`);
        console.log(`   📝 Detalhes: ${result.isValid ? 'Válido' : 'Inválido'}`);
        if (result.normalizedBrand) {
          console.log(`   📝 Marca normalizada: ${result.normalizedBrand}`);
        }
        if (result.normalizedModel) {
          console.log(`   📝 Modelo normalizado: ${result.normalizedModel}`);
        }
        failed++;
      }

      results.push({
        testCase,
        result: {
          type: finalType,
          normalizedBrand: result.normalizedBrand,
          normalizedModel: result.normalizedModel,
          isValid: result.isValid
        },
        success,
        error: success ? undefined : `Esperado "${testCase.expectedType}", obtido "${finalType || 'null'}"`
      });

      // Pequeno delay para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.log(`   ❌ ERRO: ${error.message}`);
      failed++;
      results.push({
        testCase,
        result: {
          type: null,
          normalizedBrand: null,
          normalizedModel: null,
          isValid: false
        },
        success: false,
        error: error.message
      });
    }
  }

  // Relatório final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO FINAL DE TESTES');
  console.log('='.repeat(60));
  console.log(`✅ Testes passados: ${passed}/${testCases.length}`);
  console.log(`❌ Testes falhados: ${failed}/${testCases.length}`);
  console.log(`📈 Taxa de sucesso: ${((passed / testCases.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ TESTES FALHADOS:');
    results.filter(r => !r.success).forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.testCase.title}`);
      console.log(`   Esperado: ${result.testCase.expectedType}`);
      console.log(`   Obtido: ${result.result.type || 'null'}`);
      console.log(`   Descrição: ${result.testCase.description}`);
      if (result.error) {
        console.log(`   Erro: ${result.error}`);
      }
      if (result.result.normalizedBrand) {
        console.log(`   Marca normalizada: ${result.result.normalizedBrand}`);
      }
      if (result.result.normalizedModel) {
        console.log(`   Modelo normalizado: ${result.result.normalizedModel}`);
      }
    });
  }

  if (passed === testCases.length) {
    console.log('\n🎉 Todos os testes passaram! A classificação está funcionando corretamente.');
  } else {
    console.log(`\n⚠️  ${failed} teste(s) falharam. Revisar casos problemáticos.`);
  }

  return { passed, failed, total: testCases.length, results };
}

// Executar testes
runTests()
  .then(({ passed, failed }) => {
    console.log('\n✨ Testes concluídos!');
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal durante os testes:', error);
    process.exit(1);
  });

