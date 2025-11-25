#!/usr/bin/env tsx

/**
 * Script para atualizar vehicle_type_id em modelos existentes
 * 
 * Atualiza modelos que não têm vehicle_type_id populado,
 * usando o vehicle_type_id da marca relacionada.
 * 
 * Útil quando:
 * - A migration foi executada mas alguns modelos não foram atualizados
 * - Novos modelos foram adicionados sem vehicle_type_id
 * - Dados foram importados sem vehicle_type_id
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateModelsVehicleTypeId() {
  console.log('🔄 Atualizando vehicle_type_id em modelos existentes...\n');

  try {
    // 1. Contar modelos sem vehicle_type_id
    console.log('1️⃣ Verificando modelos sem vehicle_type_id...');
    const { count: nullCount, error: countError } = await supabase
      .from('fipe_models')
      .select('*', { count: 'exact', head: true })
      .is('vehicle_type_id', null);

    if (countError) {
      console.error('❌ Erro ao contar modelos:', countError);
      return false;
    }

    if ((nullCount || 0) === 0) {
      console.log('✅ Todos os modelos já têm vehicle_type_id populado!');
      return true;
    }

    console.log(`   Encontrados ${nullCount} modelos sem vehicle_type_id\n`);

    // 2. Buscar modelos sem vehicle_type_id com suas marcas
    console.log('2️⃣ Buscando modelos e suas marcas...');
    const BATCH_SIZE = 1000;
    let offset = 0;
    let totalUpdated = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: models, error: fetchError } = await supabase
        .from('fipe_models')
        .select(`
          id,
          brand_id,
          name,
          fipe_brands!inner(id, vehicle_type_id)
        `)
        .is('vehicle_type_id', null)
        .range(offset, offset + BATCH_SIZE - 1);

      if (fetchError) {
        console.error('❌ Erro ao buscar modelos:', fetchError);
        break;
      }

      if (!models || models.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`   Processando lote: ${models.length} modelos (offset: ${offset})`);

      // 3. Atualizar cada modelo com o vehicle_type_id da marca
      const updates: Array<{ id: string; vehicle_type_id: string }> = [];

      for (const model of models) {
        const brand = (model as any).fipe_brands;
        if (brand && brand.vehicle_type_id) {
          updates.push({
            id: model.id,
            vehicle_type_id: brand.vehicle_type_id
          });
        }
      }

      // Atualizar em lotes
      if (updates.length > 0) {
        for (const update of updates) {
          const { error: updateError } = await supabase
            .from('fipe_models')
            .update({ vehicle_type_id: update.vehicle_type_id })
            .eq('id', update.id);

          if (updateError) {
            console.error(`   ❌ Erro ao atualizar modelo ${update.id}:`, updateError);
          } else {
            totalUpdated++;
          }
        }

        console.log(`   ✅ Atualizados ${updates.length} modelos neste lote`);
      }

      offset += BATCH_SIZE;
      hasMore = models.length === BATCH_SIZE;

      // Pequeno delay para não sobrecarregar o banco
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 4. Verificar se ainda há modelos sem vehicle_type_id
    console.log('\n3️⃣ Verificando resultado final...');
    const { count: remainingNulls, error: finalCheckError } = await supabase
      .from('fipe_models')
      .select('*', { count: 'exact', head: true })
      .is('vehicle_type_id', null);

    if (finalCheckError) {
      console.error('❌ Erro ao verificar resultado:', finalCheckError);
      return false;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 RESUMO DA ATUALIZAÇÃO');
    console.log('='.repeat(60));
    console.log(`✅ Modelos atualizados: ${totalUpdated}`);
    console.log(`${(remainingNulls || 0) === 0 ? '✅' : '⚠️ '} Modelos sem vehicle_type_id restantes: ${remainingNulls || 0}`);

    if ((remainingNulls || 0) > 0) {
      console.log('\n⚠️  Ainda há modelos sem vehicle_type_id.');
      console.log('   Possíveis causas:');
      console.log('   - Modelos sem marca relacionada');
      console.log('   - Marcas sem vehicle_type_id');
      console.log('   - Erros durante a atualização');
    } else {
      console.log('\n✨ Todos os modelos foram atualizados com sucesso!');
    }

    return (remainingNulls || 0) === 0;

  } catch (error: any) {
    console.error('❌ Erro durante atualização:', error);
    return false;
  }
}

// Executar atualização
updateModelsVehicleTypeId()
  .then((success) => {
    if (success) {
      console.log('\n✨ Atualização concluída com sucesso!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Atualização concluída com avisos. Revise os resultados acima.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 Erro fatal durante atualização:', error);
    process.exit(1);
  });

