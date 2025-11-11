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
import { normalizeVehicleBrandModel } from '../lib/vehicle-normalization';
import { getVehicleTableInfo, hasVehicleColumn, type VehicleTableInfo } from '../lib/scraping/vehicle-table-info';

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
  maybeAdd('modelo_original');
  maybeAdd('versao');
  maybeAdd('tipo_veiculo');
  maybeAdd('brand');
  maybeAdd('model');
  maybeAdd('version');
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

function inferVehicleTypeForFipe(vehicle: any, info: VehicleTableInfo): VehicleTypeSlug {
  const rawType =
    getColumnValue<string>(vehicle, info, 'tipo_veiculo') ??
    getColumnValue<string>(vehicle, info, 'vehicle_type');

  if (typeof rawType === 'string') {
    const normalized = rawType.toLowerCase();
    if (normalized.includes('moto') || normalized.includes('motocic')) {
      return 'motos';
    }
    if (
      normalized.includes('caminhao') ||
      normalized.includes('caminhão') ||
      normalized.includes('truck') ||
      normalized.includes('caminhonete')
    ) {
      return 'caminhoes';
    }
  }

  return 'carros';
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
  };

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

    const effectiveTotal = limit ? Math.min(limit, totalCount || limit) : totalCount;
    if (effectiveTotal > 0) {
      console.log(`📊 Total de veículos encontrados: ${effectiveTotal}`);
    } else {
      console.log('📊 Total de veículos encontrados: desconhecido (processando em lotes)');
    }

    console.log('');

    const batchSize = 1000;
    let offset = 0;
    let remaining = limit ?? Infinity;
    let hasMore = true;

    while (remaining > 0 && hasMore) {
      const rangeStart = offset;
      const desiredEnd = offset + batchSize - 1;
      const rangeEnd = limit ? Math.min(desiredEnd, offset + remaining - 1) : desiredEnd;
      const expectedBatchSize = Math.max(rangeEnd - rangeStart + 1, 0);

      if (expectedBatchSize <= 0) {
        break;
      }

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
          console.log('ℹ️  Nenhum veículo encontrado para normalizar');
        }
        break;
      }

      stats.total += vehicles.length;

      for (let i = 0; i < vehicles.length && remaining > 0; i++) {
        const vehicle = vehicles[i] as any;
        stats.processed++;

        if (stats.processed % 10 === 0) {
          console.log(`   Processando... ${stats.processed}/${limit ?? (totalCount || '???')}`);
        }

        remaining--;

        try {
          const vehicleType = inferVehicleTypeForFipe(vehicle, vehicleTableInfo);
          const { originalBrand, originalModel } = resolveCurrentBrandModel(vehicle, vehicleTableInfo);

          const result = await normalizeVehicleBrandModel(
            originalBrand ?? undefined,
            originalModel ?? undefined,
            vehicleType
          );

          const normalizedBrand = result.brand ?? null;
          const normalizedModel = result.model ?? null;
          const normalizedVariant = result.variant ?? null;

          const currentMarca = getColumnValue(vehicle, vehicleTableInfo, 'marca');
          const currentModelo = getColumnValue(vehicle, vehicleTableInfo, 'modelo');
          const currentBrandEn = getColumnValue(vehicle, vehicleTableInfo, 'brand');
          const currentModelEn = getColumnValue(vehicle, vehicleTableInfo, 'model');
          const currentVersao = getColumnValue(vehicle, vehicleTableInfo, 'versao');
          const currentVersionEn = getColumnValue(vehicle, vehicleTableInfo, 'version');
          const currentModeloOriginal = getColumnValue(vehicle, vehicleTableInfo, 'modelo_original');

          const updateData: Record<string, any> = {};
          const assign = (column: string, newValue: any, currentValue: any) => {
            if (!hasVehicleColumn(vehicleTableInfo, column)) {
              return;
            }
            const current = currentValue ?? null;
            const next = newValue ?? null;
            if (current === next) {
              return;
            }
            updateData[column] = next;
          };

          assign('marca', normalizedBrand, currentMarca);
          assign('modelo', normalizedModel, currentModelo);
          assign('modelo_original', originalModel ?? null, currentModeloOriginal);
          assign('versao', normalizedVariant, currentVersao);
          assign('brand', normalizedBrand, currentBrandEn);
          assign('model', normalizedModel, currentModelEn);
          assign('version', normalizedVariant, currentVersionEn);

          const hasChanges = Object.keys(updateData).length > 0;

          if (result.wasSeparated) {
            stats.separated++;
          }

          if (result.wasNormalized) {
            stats.normalized++;
          }

          if (!result.isValid) {
            stats.invalid++;
          }

          if (hasChanges && !dryRun) {
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
            stats.updated++;

            if (stats.updated <= 10) {
              console.log(`   📝 [DRY RUN] Veículo ${vehicle.id}:`);
              if (hasVehicleColumn(vehicleTableInfo, 'marca')) {
                console.log(`      Marca (PT): "${currentMarca}" → "${normalizedBrand}"`);
              }
              if (hasVehicleColumn(vehicleTableInfo, 'brand')) {
                console.log(`      Brand (EN): "${currentBrandEn}" → "${normalizedBrand}"`);
              }
              if (hasVehicleColumn(vehicleTableInfo, 'modelo') || hasVehicleColumn(vehicleTableInfo, 'model')) {
                console.log(`      Modelo: "${currentModelo ?? currentModelEn}" → "${normalizedModel}"`);
              }
              if (result.wasSeparated) {
                console.log(`      ⚠️  Combinação separada`);
              }
            }
          }
        } catch (error: any) {
          console.error(`   ❌ Erro ao processar veículo ${vehicle.id}:`, error.message);
          stats.errors++;
        }

        if (i < vehicles.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      if (vehicles.length < expectedBatchSize || remaining <= 0) {
        hasMore = false;
      } else {
        offset += batchSize;
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

