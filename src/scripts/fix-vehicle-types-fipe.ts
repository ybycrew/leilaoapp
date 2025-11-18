/**
 * Script para corrigir tipos de veículos na tabela vehicles usando FIPE como fonte de verdade
 * 
 * Uso:
 *   npx tsx src/scripts/fix-vehicle-types-fipe.ts
 * 
 * Nova estratégia: busca marca em TODOS os tipos usando vehicle_type_id da tabela fipe_brands.
 * Resolve casos ambíguos (ex: Honda) usando modelo quando disponível.
 * Atualiza tipo_veiculo baseado no vehicle_type_id da marca encontrada na FIPE.
 */

import { createClient } from '@supabase/supabase-js';
import { findVehicleTypeInFipe, mapFipeTypeToVehicleType } from '../lib/vehicle-normalization';
import { getVehicleTableInfo, hasVehicleColumn, type VehicleTableInfo } from '../lib/scraping/vehicle-table-info';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface FixStats {
  total: number;
  processed: number;
  updated: number;
  typeFixed: number;
  brandModelUpdated: number;
  notFound: number;
  errors: number;
}

type VehicleTypeSlug = 'carros' | 'motos' | 'caminhoes';

function buildSelectColumns(info: VehicleTableInfo): string {
  const columns: string[] = ['id'];
  const maybeAdd = (column: string) => {
    if (hasVehicleColumn(info, column)) {
      columns.push(column);
    }
  };

  maybeAdd('marca');
  maybeAdd('modelo');
  maybeAdd('tipo_veiculo');
  maybeAdd('brand');
  maybeAdd('model');
  maybeAdd('vehicle_type');

  return columns.join(', ');
}

function getColumnValue<T = any>(vehicle: any, info: VehicleTableInfo, column: string): T | null {
  if (!hasVehicleColumn(info, column)) {
    return null;
  }
  const value = vehicle[column];
  return value === undefined ? null : (value as T | null);
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function resolveCurrentBrandModel(vehicle: any, info: VehicleTableInfo) {
  const brandPt = getColumnValue<string>(vehicle, info, 'marca');
  const brandEn = getColumnValue<string>(vehicle, info, 'brand');
  const modelPt = getColumnValue<string>(vehicle, info, 'modelo');
  const modelEn = getColumnValue<string>(vehicle, info, 'model');

  return {
    currentBrand: brandEn ?? brandPt,
    currentModel: modelEn ?? modelPt,
    originalBrand: firstNonEmpty(brandEn, brandPt),
    originalModel: firstNonEmpty(modelEn, modelPt),
  };
}

function normalizeVehicleType(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  
  // Normaliza variações
  if (normalized === 'carro' || normalized === 'carros' || normalized === 'car') return 'carro';
  if (normalized === 'moto' || normalized === 'motos' || normalized === 'motocicleta') return 'moto';
  if (normalized === 'caminhao' || normalized === 'caminhão' || normalized === 'caminhoes' || normalized === 'truck') return 'caminhao';
  
  return normalized;
}

async function fixVehicleTypesWithFipe() {
  console.log('🚀 Iniciando correção de tipos de veículos usando FIPE...');
  console.log('   Processando todos os veículos da tabela vehicles');
  console.log('');

  const stats: FixStats = {
    total: 0,
    processed: 0,
    updated: 0,
    typeFixed: 0,
    brandModelUpdated: 0,
    notFound: 0,
    errors: 0,
  };

  const examples: Array<{
    id: string;
    oldType: string | null;
    newType: string | null;
    oldBrand: string | null;
    newBrand: string | null;
    oldModel: string | null;
    newModel: string | null;
  }> = [];

  try {
    const vehicleTableInfo = await getVehicleTableInfo(supabase);
    const selectColumns = buildSelectColumns(vehicleTableInfo);

    const baseFilterColumn = hasVehicleColumn(vehicleTableInfo, 'marca')
      ? 'marca'
      : hasVehicleColumn(vehicleTableInfo, 'brand')
      ? 'brand'
      : null;

    let totalCount = 0;
    if (baseFilterColumn) {
      const { count, error: countError } = await supabase
        .from('vehicles')
        .select('id', { count: 'exact', head: true })
        .not(baseFilterColumn, 'is', null);

      if (countError) {
        console.warn('⚠️  Não foi possível obter contagem total:', countError.message);
      } else if (typeof count === 'number') {
        totalCount = count;
      }
    }

    if (totalCount > 0) {
      console.log(`📊 Total de veículos encontrados: ${totalCount}`);
    } else {
      console.log('📊 Total de veículos encontrados: desconhecido (processando em lotes)');
    }

    console.log('');

    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const rangeStart = offset;
      const rangeEnd = offset + batchSize - 1;

      let query = supabase
        .from('vehicles')
        .select(selectColumns)
        .order('created_at', { ascending: false })
        .range(rangeStart, rangeEnd);

      if (baseFilterColumn) {
        query = query.not(baseFilterColumn, 'is', null);
      }

      const { data: vehicles, error: fetchError } = await query;

      if (fetchError) {
        console.error('❌ Erro ao buscar veículos:', fetchError);
        break;
      }

      if (!vehicles || vehicles.length === 0) {
        if (stats.total === 0) {
          console.log('ℹ️  Nenhum veículo encontrado para corrigir');
        }
        break;
      }

      stats.total += vehicles.length;

      for (let i = 0; i < vehicles.length; i++) {
        const vehicle = vehicles[i] as any;
        stats.processed++;

        if (stats.processed % 100 === 0) {
          console.log(`   Processando... ${stats.processed}/${totalCount || '???'}`);
        }

        try {
          const { originalBrand, originalModel } = resolveCurrentBrandModel(vehicle, vehicleTableInfo);

          if (!originalBrand) {
            // Sem marca, pula (modelo é opcional na nova estratégia)
            continue;
          }

          // Busca tipo na FIPE usando vehicle_type_id da tabela fipe_brands
          // Nova estratégia: busca marca em TODOS os tipos, resolve casos ambíguos usando modelo
          const fipeResult = await findVehicleTypeInFipe(originalBrand, originalModel || null);

          if (!fipeResult.isValid || !fipeResult.type) {
            // Não encontrado na FIPE
            stats.notFound++;
            continue;
          }

          // Tipo encontrado na FIPE
          const correctVehicleType = mapFipeTypeToVehicleType(fipeResult.type);
          const currentTipoVeiculo = getColumnValue<string>(vehicle, vehicleTableInfo, 'tipo_veiculo');
          const currentVehicleType = getColumnValue<string>(vehicle, vehicleTableInfo, 'vehicle_type');
          const currentMarca = getColumnValue<string>(vehicle, vehicleTableInfo, 'marca');
          const currentModelo = getColumnValue<string>(vehicle, vehicleTableInfo, 'modelo');
          const currentBrandEn = getColumnValue<string>(vehicle, vehicleTableInfo, 'brand');
          const currentModelEn = getColumnValue<string>(vehicle, vehicleTableInfo, 'model');

          const normalizedCurrentType = normalizeVehicleType(currentTipoVeiculo ?? currentVehicleType);
          let needsTypeUpdate = false;
          let needsBrandModelUpdate = false;

          if (normalizedCurrentType !== correctVehicleType) {
            needsTypeUpdate = true;
          }

          const normalizedBrand = fipeResult.normalizedBrand;
          const normalizedModel = fipeResult.normalizedModel;

          if (normalizedBrand && normalizedBrand !== (currentBrandEn ?? currentMarca)) {
            needsBrandModelUpdate = true;
          }

          if (normalizedModel && normalizedModel !== (currentModelEn ?? currentModelo)) {
            needsBrandModelUpdate = true;
          }

          if (!needsTypeUpdate && !needsBrandModelUpdate) {
            // Já está correto
            continue;
          }

          // Prepara dados para atualização
          const updateData: Record<string, any> = {};
          const assign = (column: string, newValue: any, currentValue: any) => {
            if (!hasVehicleColumn(vehicleTableInfo, column)) {
              return;
            }
            const current = currentValue ?? null;
            const next = newValue ?? null;
            if (current !== next) {
              updateData[column] = next;
            }
          };

          if (needsTypeUpdate) {
            assign('tipo_veiculo', correctVehicleType, currentTipoVeiculo);
            assign('vehicle_type', correctVehicleType, currentVehicleType);
            stats.typeFixed++;
          }

          if (needsBrandModelUpdate) {
            if (normalizedBrand) {
              assign('marca', normalizedBrand, currentMarca);
              assign('brand', normalizedBrand, currentBrandEn);
            }
            if (normalizedModel) {
              assign('modelo', normalizedModel, currentModelo);
              assign('model', normalizedModel, currentModelEn);
            }
            stats.brandModelUpdated++;
          }

          if (Object.keys(updateData).length > 0) {
            // Salva exemplo para relatório
            if (examples.length < 10) {
              examples.push({
                id: vehicle.id,
                oldType: normalizedCurrentType,
                newType: correctVehicleType,
                oldBrand: currentBrandEn ?? currentMarca,
                newBrand: normalizedBrand ?? null,
                oldModel: currentModelEn ?? currentModelo,
                newModel: normalizedModel ?? null,
              });
            }

            // Atualiza no banco
            const { error: updateError } = await supabase
              .from('vehicles')
              .update(updateData)
              .eq('id', vehicle.id);

            if (updateError) {
              console.error(`   ❌ Erro ao atualizar veículo ${vehicle.id}:`, updateError.message);
              stats.errors++;
            } else {
              stats.updated++;

              if (stats.updated % 50 === 0) {
                console.log(`   ✅ ${stats.updated} veículos atualizados`);
              }
            }
          }
        } catch (error: any) {
          console.error(`   ❌ Erro ao processar veículo ${vehicle.id}:`, error.message);
          stats.errors++;
        }

        // Pequeno delay para não sobrecarregar
        if (i < vehicles.length - 1 && stats.processed % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      if (vehicles.length < batchSize) {
        hasMore = false;
      } else {
        offset += batchSize;
      }
    }

    // Relatório final
    console.log('');
    console.log('📊 Relatório de Correção de Tipos:');
    console.log(`   Total de veículos: ${stats.total}`);
    console.log(`   Processados: ${stats.processed}`);
    console.log(`   Atualizados: ${stats.updated}`);
    console.log(`   Tipos corrigidos: ${stats.typeFixed}`);
    console.log(`   Marca/Modelo atualizados: ${stats.brandModelUpdated}`);
    console.log(`   Não encontrados na FIPE: ${stats.notFound}`);
    console.log(`   Erros: ${stats.errors}`);

    if (examples.length > 0) {
      console.log('');
      console.log('📝 Exemplos de correções realizadas:');
      for (const example of examples) {
        console.log(`   • Veículo ${example.id}:`);
        if (example.oldType !== example.newType) {
          console.log(`     Tipo: "${example.oldType}" → "${example.newType}"`);
        }
        if (example.newBrand && example.oldBrand !== example.newBrand) {
          console.log(`     Marca: "${example.oldBrand}" → "${example.newBrand}"`);
        }
        if (example.newModel && example.oldModel !== example.newModel) {
          console.log(`     Modelo: "${example.oldModel}" → "${example.newModel}"`);
        }
      }
    }

    console.log('');
    console.log('✅ Correção de tipos concluída!');
  } catch (error: any) {
    console.error('❌ Erro fatal na correção:', error);
    process.exit(1);
  }
}

// Executar correção
fixVehicleTypesWithFipe()
  .then(() => {
    console.log('');
    console.log('✨ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro ao executar script:', error);
    process.exit(1);
  });

