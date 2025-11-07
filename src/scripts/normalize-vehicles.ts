/**
 * Script para normalizar marcas e modelos de veículos existentes no banco de dados
 * 
 * Uso:
 *   npx tsx src/scripts/normalize-vehicles.ts [--dry-run] [--limit N]
 * 
 * Opções:
 *   --dry-run: Apenas mostra o que seria alterado, não salva no banco
 *   --limit N: Processa apenas os primeiros N veículos (útil para testes)
 */

import { createClient } from '@supabase/supabase-js';
import {
  isBannedBrandName,
  isValidState,
  normalizeVehicleBrandModel,
  normalizeStateCity,
  normalizeState,
  normalizeCityName
} from '../lib/vehicle-normalization';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface NormalizationStats {
  total: number;
  processed: number;
  updated: number;
  separated: number;
  normalized: number;
  invalid: number;
  errors: number;
  bannedRemoved: number;
  statesUpdated: number;
  citiesUpdated: number;
}

async function normalizeVehicles(dryRun: boolean = false, limit?: number) {
  console.log('🚀 Iniciando normalização de veículos...');
  console.log(`   Modo: ${dryRun ? 'DRY RUN (não salvará alterações)' : 'PRODUÇÃO (salvará alterações)'}`);
  if (limit) {
    console.log(`   Limite: ${limit} veículos`);
  }
  console.log('');

  const stats: NormalizationStats = {
    total: 0,
    processed: 0,
    updated: 0,
    separated: 0,
    normalized: 0,
    invalid: 0,
    errors: 0,
    bannedRemoved: 0,
    statesUpdated: 0,
    citiesUpdated: 0,
  };

  try {
    // Buscar todos os veículos (ou limitado)
    let query = supabase
      .from('vehicles')
      .select('id, marca, modelo, tipo_veiculo, estado, cidade')
      .not('marca', 'is', null)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: vehicles, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Erro ao buscar veículos:', fetchError);
      return;
    }

    if (!vehicles || vehicles.length === 0) {
      console.log('ℹ️  Nenhum veículo encontrado para normalizar');
      return;
    }

    stats.total = vehicles.length;
    console.log(`📊 Total de veículos encontrados: ${stats.total}`);
    console.log('');

    // Processar cada veículo
    for (let i = 0; i < vehicles.length; i++) {
      const vehicle = vehicles[i];
      stats.processed++;

      if (stats.processed % 10 === 0) {
        console.log(`   Processando... ${stats.processed}/${stats.total}`);
      }

      try {
        // Determinar tipo de veículo para validação FIPE
        const vehicleType = vehicle.tipo_veiculo === 'moto' ? 'motos' :
                           vehicle.tipo_veiculo === 'caminhao' ? 'caminhoes' : 'carros';

        // Normalizar marca e modelo
        const result = await normalizeVehicleBrandModel(
          vehicle.marca,
          vehicle.modelo,
          vehicleType as 'carros' | 'motos' | 'caminhoes'
        );

        // Verificar se houve mudanças
        const brandChanged = vehicle.marca !== result.brand;
        const modelChanged = vehicle.modelo !== result.model;

        const locationNormalization = normalizeStateCity(vehicle.estado, vehicle.cidade);
        let normalizedState = locationNormalization.state ?? normalizeState(vehicle.estado);
        let normalizedCity = locationNormalization.city ?? normalizeCityName(vehicle.cidade);

        if (!normalizedState && vehicle.estado && isValidState(vehicle.estado)) {
          normalizedState = vehicle.estado.toUpperCase();
        }

        const stateChanged = normalizedState !== undefined && normalizedState !== null && normalizedState !== vehicle.estado;
        const cityChanged = normalizedCity !== undefined && normalizedCity !== null && normalizedCity !== vehicle.cidade;

        const hasChanges = brandChanged || modelChanged || stateChanged || cityChanged;

        if (result.wasSeparated) {
          stats.separated++;
        }

        if (result.wasNormalized) {
          stats.normalized++;
        }

        if (!result.isValid) {
          stats.invalid++;
        }

        if (!result.brand && vehicle.marca && isBannedBrandName(vehicle.marca)) {
          stats.bannedRemoved++;
        }

        if (stateChanged && normalizedState && isValidState(normalizedState)) {
          stats.statesUpdated++;
        }

        if (cityChanged && normalizedCity) {
          stats.citiesUpdated++;
        }

        // Se houve mudanças, atualizar no banco
        if (hasChanges && !dryRun) {
          const updateData: Record<string, any> = {};
          if (brandChanged) updateData.marca = result.brand;
          if (modelChanged) updateData.modelo = result.model;
          if (stateChanged && normalizedState && isValidState(normalizedState)) {
            updateData.estado = normalizedState;
          }
          if (cityChanged && normalizedCity) {
            updateData.cidade = normalizedCity;
          }

          const { error: updateError } = await supabase
            .from('vehicles')
            .update(updateData)
            .eq('id', vehicle.id);

          if (updateError) {
            console.error(`   ❌ Erro ao atualizar veículo ${vehicle.id}:`, updateError.message);
            stats.errors++;
          } else {
            stats.updated++;
            
            if (stats.updated % 5 === 0) {
              console.log(`   ✅ ${stats.updated} veículos atualizados`);
            }
          }
        } else if (hasChanges && dryRun) {
          // Em dry-run, apenas contar como atualizado
          stats.updated++;
          
          if (stats.updated <= 10) {
            console.log(`   📝 [DRY RUN] Veículo ${vehicle.id}:`);
            console.log(`      Marca: "${vehicle.marca}" → "${result.brand}"`);
            if (modelChanged) {
              console.log(`      Modelo: "${vehicle.modelo}" → "${result.model}"`);
            }
            if (result.wasSeparated) {
              console.log(`      ⚠️  Combinação separada`);
            }
            if (!result.brand && vehicle.marca && isBannedBrandName(vehicle.marca)) {
              console.log(`      🚫 Marca original marcada como proibida e removida`);
            }
            if (stateChanged && normalizedState && isValidState(normalizedState)) {
              console.log(`      Estado: "${vehicle.estado}" → "${normalizedState}"`);
            }
            if (cityChanged && normalizedCity) {
              console.log(`      Cidade: "${vehicle.cidade}" → "${normalizedCity}"`);
            }
          }
        }
      } catch (error: any) {
        console.error(`   ❌ Erro ao processar veículo ${vehicle.id}:`, error.message);
        stats.errors++;
      }

      // Pequeno delay para não sobrecarregar a API FIPE
      if (i < vehicles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Relatório final
    console.log('');
    console.log('📊 Relatório de Normalização:');
    console.log(`   Total de veículos: ${stats.total}`);
    console.log(`   Processados: ${stats.processed}`);
    console.log(`   Atualizados: ${stats.updated}`);
    console.log(`   Combinações separadas: ${stats.separated}`);
    console.log(`   Normalizados: ${stats.normalized}`);
    console.log(`   Inválidos: ${stats.invalid}`);
    console.log(`   Marcas removidas (banned): ${stats.bannedRemoved}`);
    console.log(`   Estados atualizados: ${stats.statesUpdated}`);
    console.log(`   Cidades atualizadas: ${stats.citiesUpdated}`);
    console.log(`   Erros: ${stats.errors}`);

    if (dryRun) {
      console.log('');
      console.log('⚠️  MODO DRY RUN - Nenhuma alteração foi salva no banco');
      console.log('   Execute sem --dry-run para aplicar as alterações');
    } else {
      console.log('');
      console.log('✅ Normalização concluída!');
    }
  } catch (error: any) {
    console.error('❌ Erro fatal na normalização:', error);
    process.exit(1);
  }
}

// Parse argumentos da linha de comando
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 && args[limitIndex + 1] 
  ? parseInt(args[limitIndex + 1], 10) 
  : undefined;

// Executar normalização
normalizeVehicles(dryRun, limit)
  .then(() => {
    console.log('');
    console.log('✨ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro ao executar script:', error);
    process.exit(1);
  });

