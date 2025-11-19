/**
 * Script de Análise de Classificação de Tipos de Veículos
 * 
 * Identifica veículos com classificação suspeita ou incorreta
 * Gera relatórios estatísticos e lista veículos que precisam correção
 */

import { createClient } from '@supabase/supabase-js';
import { classifyVehicleType } from '../lib/vehicle-type-classifier';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

interface AnalysisStats {
  total: number;
  analyzed: number;
  suspicious: number;
  lowConfidence: number;
  typeMismatches: {
    carroAsCaminhao: number;
    motoAsCarro: number;
    carroAsMoto: number;
    caminhaoAsCarro: number;
    outros: number;
  };
  examples: Array<{
    id: string;
    title: string;
    brand: string | null;
    model: string | null;
    currentType: string | null;
    suggestedType: string;
    confidence: number;
    reasons: string[];
  }>;
}

async function analyzeVehicleTypes() {
  console.log('🔍 Iniciando análise de classificação de tipos de veículos...\n');

  const stats: AnalysisStats = {
    total: 0,
    analyzed: 0,
    suspicious: 0,
    lowConfidence: 0,
    typeMismatches: {
      carroAsCaminhao: 0,
      motoAsCarro: 0,
      carroAsMoto: 0,
      caminhaoAsCarro: 0,
      outros: 0,
    },
    examples: [],
  };

  try {
    // Buscar veículos com marca e título
    const batchSize = 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('id, title, brand, model, vehicle_type, fuel_type, mileage, current_bid')
        .not('brand', 'is', null)
        .not('title', 'is', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('❌ Erro ao buscar veículos:', error);
        break;
      }

      if (!vehicles || vehicles.length === 0) {
        hasMore = false;
        break;
      }

      stats.total += vehicles.length;

      for (const vehicle of vehicles) {
        try {
          stats.analyzed++;

          if (stats.analyzed % 100 === 0) {
            console.log(`   Analisando... ${stats.analyzed}`);
          }

          const currentType = vehicle.vehicle_type?.toLowerCase() || null;
          
          // Classificar usando estratégia multi-camada
          const classification = await classifyVehicleType(
            vehicle.title,
            vehicle.brand || null,
            vehicle.model || null,
            vehicle.fuel_type || null,
            vehicle.mileage || null,
            vehicle.current_bid || null
          );

          // Verificar se há suspeita
          const isSuspicious = 
            classification.confidence < 70 || // Baixa confiança
            (currentType && currentType !== classification.type); // Tipo diferente

          if (isSuspicious) {
            stats.suspicious++;

            if (classification.confidence < 70) {
              stats.lowConfidence++;
            }

            // Classificar tipo de erro
            if (currentType) {
              const normalizedCurrent = currentType === 'carro' ? 'carro' :
                                       currentType === 'moto' ? 'moto' :
                                       currentType === 'caminhao' || currentType === 'caminhão' ? 'caminhao' :
                                       'outros';
              
              if (normalizedCurrent === 'carro' && classification.type === 'caminhao') {
                stats.typeMismatches.carroAsCaminhao++;
              } else if (normalizedCurrent === 'moto' && classification.type === 'carro') {
                stats.typeMismatches.motoAsCarro++;
              } else if (normalizedCurrent === 'carro' && classification.type === 'moto') {
                stats.typeMismatches.carroAsMoto++;
              } else if (normalizedCurrent === 'caminhao' && classification.type === 'carro') {
                stats.typeMismatches.caminhaoAsCarro++;
              } else {
                stats.typeMismatches.outros++;
              }
            }

            // Salvar exemplo (até 50)
            if (stats.examples.length < 50) {
              stats.examples.push({
                id: vehicle.id,
                title: vehicle.title.substring(0, 100),
                brand: vehicle.brand,
                model: vehicle.model,
                currentType: currentType,
                suggestedType: classification.type,
                confidence: classification.confidence,
                reasons: classification.reasons,
              });
            }
          }

          // Pequeno delay para não sobrecarregar
          if (stats.analyzed % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        } catch (error: any) {
          console.error(`   ❌ Erro ao analisar veículo ${vehicle.id}:`, error.message);
        }
      }

      if (vehicles.length < batchSize) {
        hasMore = false;
      } else {
        offset += batchSize;
      }
    }

    // Relatório
    console.log('\n📊 Relatório de Análise:');
    console.log(`   Total de veículos: ${stats.total}`);
    console.log(`   Analisados: ${stats.analyzed}`);
    console.log(`   Suspeitos: ${stats.suspicious} (${((stats.suspicious / stats.analyzed) * 100).toFixed(2)}%)`);
    console.log(`   Baixa confiança: ${stats.lowConfidence} (${((stats.lowConfidence / stats.analyzed) * 100).toFixed(2)}%)`);
    console.log('\n📈 Tipos de Erros Detectados:');
    console.log(`   Carros como Caminhões: ${stats.typeMismatches.carroAsCaminhao}`);
    console.log(`   Motos como Carros: ${stats.typeMismatches.motoAsCarro}`);
    console.log(`   Carros como Motos: ${stats.typeMismatches.carroAsMoto}`);
    console.log(`   Caminhões como Carros: ${stats.typeMismatches.caminhaoAsCarro}`);
    console.log(`   Outros: ${stats.typeMismatches.outros}`);

    if (stats.examples.length > 0) {
      console.log('\n📝 Exemplos de Veículos Suspeitos:');
      for (let i = 0; i < Math.min(20, stats.examples.length); i++) {
        const ex = stats.examples[i];
        console.log(`\n   ${i + 1}. Veículo ${ex.id.substring(0, 8)}...`);
        console.log(`      Título: ${ex.title}`);
        console.log(`      Marca: ${ex.brand || 'N/A'}, Modelo: ${ex.model || 'N/A'}`);
        console.log(`      Tipo Atual: ${ex.currentType || 'N/A'} → Sugerido: ${ex.suggestedType} (confiança: ${ex.confidence}%)`);
        console.log(`      Razões: ${ex.reasons.join('; ')}`);
      }
    }

    console.log('\n✅ Análise concluída!');
    console.log('\n💡 Próximos passos:');
    console.log('   1. Execute o script de correção: npm run fix-types');
    console.log('   2. Revise os exemplos acima');
    console.log('   3. Execute correção em massa após revisão');

  } catch (error: any) {
    console.error('❌ Erro fatal na análise:', error);
    process.exit(1);
  }
}

// Executar análise
analyzeVehicleTypes()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro ao executar análise:', error);
    process.exit(1);
  });

