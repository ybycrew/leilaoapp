/**
 * Script de Correção em Massa de Tipos de Veículos
 * 
 * Corrige tipos de veículos usando estratégia multi-camada
 * - Modo dry-run disponível (--dry-run)
 * - Aplica correções apenas se confiança > 70%
 * - Gera relatório detalhado
 */

import { createClient } from '@supabase/supabase-js';
import { classifyVehicleType } from '../lib/vehicle-type-classifier';
import { normalizeVehicleTypeForDB } from '../lib/scraping/utils';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Verificar modo dry-run
const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');
const minConfidence = 70; // Confiança mínima para aplicar correção

interface FixStats {
  total: number;
  processed: number;
  corrected: number;
  skipped: number;
  errors: number;
  corrections: Array<{
    id: string;
    title: string;
    oldType: string | null;
    newType: string;
    confidence: number;
    reasons: string[];
  }>;
}

// Usar função centralizada de normalização
const normalizeTypeForDB = normalizeVehicleTypeForDB;

async function fixAllVehicleTypes() {
  console.log('🚀 Iniciando correção em massa de tipos de veículos...');
  if (isDryRun) {
    console.log('⚠️  MODO DRY-RUN: Nenhuma alteração será aplicada\n');
  }
  console.log(`   Confiança mínima: ${minConfidence}%`);
  console.log('');

  const stats: FixStats = {
    total: 0,
    processed: 0,
    corrected: 0,
    skipped: 0,
    errors: 0,
    corrections: [],
  };

  try {
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
          stats.processed++;

          if (stats.processed % 100 === 0) {
            console.log(`   Processando... ${stats.processed}`);
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

          // Verificar se precisa correção
          const needsCorrection = 
            classification.confidence >= minConfidence &&
            (!currentType || currentType !== classification.type.toLowerCase());

          if (!needsCorrection) {
            stats.skipped++;
            continue;
          }

          // Preparar correção
          const newType = normalizeTypeForDB(classification.type);
          
          stats.corrections.push({
            id: vehicle.id,
            title: vehicle.title.substring(0, 80),
            oldType: currentType || 'null',
            newType: classification.type,
            confidence: classification.confidence,
            reasons: classification.reasons,
          });

          // Aplicar correção (se não for dry-run)
          if (!isDryRun) {
            const { error: updateError } = await supabase
              .from('vehicles')
              .update({ vehicle_type: newType })
              .eq('id', vehicle.id);

            if (updateError) {
              console.error(`   ❌ Erro ao corrigir veículo ${vehicle.id}:`, updateError.message);
              stats.errors++;
              continue;
            }
          }

          stats.corrected++;

          if (stats.corrected % 50 === 0) {
            console.log(`   ✅ ${stats.corrected} veículos corrigidos`);
          }

          // Pequeno delay
          if (stats.processed % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        } catch (error: any) {
          console.error(`   ❌ Erro ao processar veículo ${vehicle.id}:`, error.message);
          stats.errors++;
        }
      }

      if (vehicles.length < batchSize) {
        hasMore = false;
      } else {
        offset += batchSize;
      }
    }

    // Relatório final
    console.log('\n📊 Relatório de Correção:');
    console.log(`   Total de veículos: ${stats.total}`);
    console.log(`   Processados: ${stats.processed}`);
    console.log(`   ${isDryRun ? 'Seriam corrigidos' : 'Corrigidos'}: ${stats.corrected}`);
    console.log(`   Pulados: ${stats.skipped} (já corretos ou baixa confiança)`);
    console.log(`   Erros: ${stats.errors}`);

    if (stats.corrections.length > 0) {
      console.log('\n📝 Primeiras 20 Correções:');
      for (let i = 0; i < Math.min(20, stats.corrections.length); i++) {
        const corr = stats.corrections[i];
        console.log(`\n   ${i + 1}. Veículo ${corr.id.substring(0, 8)}...`);
        console.log(`      Título: ${corr.title}`);
        console.log(`      Tipo: "${corr.oldType}" → "${corr.newType}" (confiança: ${corr.confidence}%)`);
        console.log(`      Razões: ${corr.reasons.join('; ')}`);
      }
    }

    if (isDryRun) {
      console.log('\n⚠️  MODO DRY-RUN: Nenhuma alteração foi aplicada');
      console.log('   Execute sem --dry-run para aplicar correções');
    } else {
      console.log('\n✅ Correção concluída!');
    }

  } catch (error: any) {
    console.error('❌ Erro fatal na correção:', error);
    process.exit(1);
  }
}

// Executar correção
fixAllVehicleTypes()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro ao executar correção:', error);
    process.exit(1);
  });

