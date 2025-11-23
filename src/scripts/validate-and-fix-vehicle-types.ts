#!/usr/bin/env tsx

/**
 * Script Integrado de Validação e Correção de Tipos de Veículos
 * 
 * Executa validação completa e correção automática de tipos de veículos:
 * 1. Analisa classificações atuais
 * 2. Identifica problemas usando classificador multi-camada
 * 3. Corrige tipos com confiança >= 70%
 * 4. Valida por modelos conhecidos
 * 5. Gera relatório completo
 */

import { createClient } from '@supabase/supabase-js';
import { classifyVehicleType } from '../lib/vehicle-type-classifier';
import { normalizeVehicleTypeForDB, validateVehicleTypeByModel } from '../lib/scraping/utils';
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

interface ValidationStats {
  total: number;
  analyzed: number;
  corrected: number;
  validationErrors: number;
  classificationErrors: number;
  corrections: Array<{
    id: string;
    title: string;
    oldType: string;
    newType: string;
    confidence: number;
    source: string;
    reasons: string[];
  }>;
  validationFixes: Array<{
    id: string;
    title: string;
    brand: string;
    model: string;
    oldType: string;
    newType: string;
    reason: string;
  }>;
}

async function validateAndFixVehicleTypes() {
  console.log('🔧 Iniciando validação e correção integrada de tipos de veículos...');
  if (isDryRun) {
    console.log('🔍 MODO DRY-RUN: Nenhuma alteração será feita no banco de dados\n');
  } else {
    console.log('⚠️  MODO REAL: Alterações serão aplicadas no banco de dados\n');
  }

  const stats: ValidationStats = {
    total: 0,
    analyzed: 0,
    corrected: 0,
    validationErrors: 0,
    classificationErrors: 0,
    corrections: [],
    validationFixes: []
  };

  try {
    // Buscar todos os veículos ativos
    console.log('📊 Buscando veículos do banco de dados...');
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('id, titulo, marca, modelo, tipo_veiculo, ano, km, preco_atual')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar veículos: ${error.message}`);
    }

    if (!vehicles || vehicles.length === 0) {
      console.log('❌ Nenhum veículo encontrado no banco de dados');
      return;
    }

    stats.total = vehicles.length;
    console.log(`✅ Encontrados ${stats.total} veículos para analisar\n`);

    // Processar cada veículo
    for (let i = 0; i < vehicles.length; i++) {
      const vehicle = vehicles[i];
      const progress = Math.round((i / vehicles.length) * 100);
      
      if (i % 100 === 0) {
        console.log(`📈 Progresso: ${progress}% (${i}/${vehicles.length})`);
      }

      try {
        stats.analyzed++;
        let needsUpdate = false;
        let newType = vehicle.tipo_veiculo;
        let correctionReason = '';
        let correctionSource = '';
        let confidence = 0;
        let reasons: string[] = [];

        // Etapa 1: Validação por modelo conhecido
        const modelValidation = validateVehicleTypeByModel(
          vehicle.tipo_veiculo || 'carro',
          vehicle.marca,
          vehicle.modelo,
          vehicle.titulo
        );

        if (!modelValidation.valid && modelValidation.suggestedType) {
          newType = normalizeVehicleTypeForDB(modelValidation.suggestedType);
          needsUpdate = true;
          correctionReason = modelValidation.reason || 'Validação por modelo';
          correctionSource = 'model_validation';
          confidence = 95;
          reasons = [correctionReason];

          stats.validationFixes.push({
            id: vehicle.id,
            title: vehicle.titulo || '',
            brand: vehicle.marca || '',
            model: vehicle.modelo || '',
            oldType: vehicle.tipo_veiculo || 'carro',
            newType: newType,
            reason: correctionReason
          });

          stats.validationErrors++;
        }

        // Etapa 2: Classificação multi-camada (se não foi corrigido por validação)
        if (!needsUpdate) {
          try {
            const classification = await classifyVehicleType(
              vehicle.titulo || '',
              vehicle.marca,
              vehicle.modelo,
              null, // fuel_type
              vehicle.km,
              vehicle.preco_atual
            );

            const normalizedClassification = normalizeVehicleTypeForDB(classification.type);
            const currentType = vehicle.tipo_veiculo || 'carro';

            if (classification.confidence >= minConfidence && normalizedClassification !== currentType) {
              newType = normalizedClassification;
              needsUpdate = true;
              correctionReason = `Classificação multi-camada (${classification.source})`;
              correctionSource = classification.source;
              confidence = classification.confidence;
              reasons = classification.reasons;

              stats.corrections.push({
                id: vehicle.id,
                title: vehicle.titulo || '',
                oldType: currentType,
                newType: newType,
                confidence: confidence,
                source: correctionSource,
                reasons: reasons
              });
            }
          } catch (error) {
            console.error(`Erro na classificação do veículo ${vehicle.id}:`, error);
            stats.classificationErrors++;
          }
        }

        // Aplicar correção se necessário
        if (needsUpdate && !isDryRun) {
          const { error: updateError } = await supabase
            .from('vehicles')
            .update({ tipo_veiculo: newType })
            .eq('id', vehicle.id);

          if (updateError) {
            console.error(`Erro ao atualizar veículo ${vehicle.id}:`, updateError);
          } else {
            stats.corrected++;
          }
        } else if (needsUpdate && isDryRun) {
          stats.corrected++; // Contar como corrigido no dry-run
        }

      } catch (error) {
        console.error(`Erro ao processar veículo ${vehicle.id}:`, error);
      }
    }

    // Relatório final
    console.log('\n' + '='.repeat(60));
    console.log('📋 RELATÓRIO FINAL DE VALIDAÇÃO E CORREÇÃO');
    console.log('='.repeat(60));
    console.log(`📊 Total de veículos: ${stats.total}`);
    console.log(`🔍 Analisados: ${stats.analyzed}`);
    console.log(`✅ Corrigidos: ${stats.corrected}`);
    console.log(`⚠️  Erros de validação encontrados: ${stats.validationErrors}`);
    console.log(`❌ Erros de classificação: ${stats.classificationErrors}`);
    console.log(`📈 Taxa de correção: ${((stats.corrected / stats.analyzed) * 100).toFixed(1)}%`);

    if (stats.validationFixes.length > 0) {
      console.log('\n🔧 CORREÇÕES POR VALIDAÇÃO DE MODELO:');
      stats.validationFixes.slice(0, 10).forEach(fix => {
        console.log(`  • ${fix.title.substring(0, 50)}... | ${fix.brand} ${fix.model}`);
        console.log(`    ${fix.oldType} → ${fix.newType} (${fix.reason})`);
      });
      if (stats.validationFixes.length > 10) {
        console.log(`    ... e mais ${stats.validationFixes.length - 10} correções`);
      }
    }

    if (stats.corrections.length > 0) {
      console.log('\n🤖 CORREÇÕES POR CLASSIFICAÇÃO MULTI-CAMADA:');
      stats.corrections.slice(0, 10).forEach(correction => {
        console.log(`  • ${correction.title.substring(0, 50)}...`);
        console.log(`    ${correction.oldType} → ${correction.newType} (${correction.confidence}% - ${correction.source})`);
        console.log(`    Razões: ${correction.reasons.join('; ')}`);
      });
      if (stats.corrections.length > 10) {
        console.log(`    ... e mais ${stats.corrections.length - 10} correções`);
      }
    }

    if (isDryRun) {
      console.log('\n💡 Para aplicar as correções, execute o script sem --dry-run');
    } else {
      console.log('\n✅ Correções aplicadas com sucesso!');
    }

  } catch (error) {
    console.error('❌ Erro durante a validação e correção:', error);
    process.exit(1);
  }
}

// Executar script
validateAndFixVehicleTypes()
  .then(() => {
    console.log('\n🎉 Script de validação e correção concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
