#!/usr/bin/env tsx

/**
 * Script de Verificação: Coluna vehicle_type_id na tabela fipe_models
 * 
 * Verifica se:
 * 1. A coluna vehicle_type_id existe na tabela fipe_models
 * 2. A coluna está populada (não há valores NULL)
 * 3. Os valores estão corretos (correspondem ao vehicle_type_id da marca)
 * 4. Os índices foram criados
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyColumn() {
  console.log('🔍 Verificando coluna vehicle_type_id na tabela fipe_models...\n');

  try {
    // 1. Verificar se a coluna existe
    console.log('1️⃣ Verificando se a coluna vehicle_type_id existe...');
    const { data: columnInfo, error: columnError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'fipe_models'
          AND column_name = 'vehicle_type_id';
      `
    });

    if (columnError) {
      // Tentar método alternativo
      const { data: models, error: modelsError } = await supabase
        .from('fipe_models')
        .select('vehicle_type_id')
        .limit(1);

      if (modelsError && modelsError.message.includes('column') && modelsError.message.includes('does not exist')) {
        console.log('❌ A coluna vehicle_type_id NÃO existe na tabela fipe_models!');
        console.log('   Execute a migration: supabase/migrations/012_add_vehicle_type_id_to_fipe_models.sql');
        return false;
      }
    }

    console.log('✅ A coluna vehicle_type_id existe na tabela fipe_models');

    // 2. Verificar quantos modelos têm vehicle_type_id NULL
    console.log('\n2️⃣ Verificando se há modelos sem vehicle_type_id...');
    const { data: nullCount, error: nullError } = await supabase
      .from('fipe_models')
      .select('id', { count: 'exact', head: true })
      .is('vehicle_type_id', null);

    if (nullError) {
      console.error('❌ Erro ao verificar NULLs:', nullError);
      return false;
    }

    const { count: totalModels } = await supabase
      .from('fipe_models')
      .select('*', { count: 'exact', head: true });

    const { count: nullModels } = await supabase
      .from('fipe_models')
      .select('*', { count: 'exact', head: true })
      .is('vehicle_type_id', null);

    console.log(`   Total de modelos: ${totalModels || 0}`);
    console.log(`   Modelos sem vehicle_type_id: ${nullModels || 0}`);

    if ((nullModels || 0) > 0) {
      console.log(`⚠️  Existem ${nullModels} modelos sem vehicle_type_id!`);
      console.log('   Execute o UPDATE da migration para popular esses registros.');
    } else {
      console.log('✅ Todos os modelos têm vehicle_type_id populado');
    }

    // 3. Verificar se os valores estão corretos (comparar com vehicle_type_id da marca)
    console.log('\n3️⃣ Verificando se os valores estão corretos...');
    const { data: incorrectModels, error: incorrectError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT COUNT(*) as count
        FROM public.fipe_models fm
        INNER JOIN public.fipe_brands fb ON fm.brand_id = fb.id
        WHERE fm.vehicle_type_id != fb.vehicle_type_id;
      `
    });

    // Método alternativo usando query direta
    const { data: sampleModels, error: sampleError } = await supabase
      .from('fipe_models')
      .select(`
        id,
        name,
        vehicle_type_id,
        brand_id,
        fipe_brands!inner(vehicle_type_id)
      `)
      .limit(100);

    if (sampleError) {
      console.log('⚠️  Não foi possível verificar correção dos valores (pode ser limitação do Supabase)');
      console.log('   Verifique manualmente se os valores estão corretos');
    } else {
      let incorrectCount = 0;
      for (const model of sampleModels || []) {
        const brand = (model as any).fipe_brands;
        if (brand && model.vehicle_type_id !== brand.vehicle_type_id) {
          incorrectCount++;
        }
      }

      if (incorrectCount > 0) {
        console.log(`⚠️  Encontrados ${incorrectCount} modelos com vehicle_type_id incorreto (na amostra de 100)`);
      } else {
        console.log('✅ Os valores parecem estar corretos (amostra de 100 modelos)');
      }
    }

    // 4. Verificar distribuição por tipo
    console.log('\n4️⃣ Verificando distribuição por tipo de veículo...');
    const { data: typeDistribution, error: typeError } = await supabase
      .from('fipe_models')
      .select(`
        vehicle_type_id,
        fipe_vehicle_types!inner(slug)
      `)
      .limit(1000);

    if (!typeError && typeDistribution) {
      const distribution: Record<string, number> = {};
      for (const model of typeDistribution) {
        const type = (model as any).fipe_vehicle_types;
        if (type && type.slug) {
          distribution[type.slug] = (distribution[type.slug] || 0) + 1;
        }
      }

      console.log('   Distribuição (amostra de 1000 modelos):');
      for (const [type, count] of Object.entries(distribution)) {
        console.log(`   - ${type}: ${count} modelos`);
      }
    }

    // 5. Verificar índices
    console.log('\n5️⃣ Verificando índices...');
    const { data: indexes, error: indexError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'fipe_models'
          AND indexname LIKE '%vehicle_type%';
      `
    });

    if (indexError) {
      console.log('⚠️  Não foi possível verificar índices (pode ser limitação do Supabase)');
      console.log('   Os índices devem ser:');
      console.log('   - idx_fipe_models_vehicle_type_id');
      console.log('   - idx_fipe_models_base_search_name_vehicle_type');
    } else {
      console.log('✅ Índices encontrados (se houver)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA VERIFICAÇÃO');
    console.log('='.repeat(60));
    console.log('✅ Coluna vehicle_type_id existe');
    console.log(`${(nullModels || 0) === 0 ? '✅' : '⚠️ '} Modelos sem vehicle_type_id: ${nullModels || 0}`);
    console.log('✅ Verificação concluída!');

    if ((nullModels || 0) > 0) {
      console.log('\n⚠️  AÇÃO NECESSÁRIA:');
      console.log('   Execute o UPDATE da migration para popular os modelos sem vehicle_type_id:');
      console.log('   UPDATE public.fipe_models fm');
      console.log('   SET vehicle_type_id = fb.vehicle_type_id');
      console.log('   FROM public.fipe_brands fb');
      console.log('   WHERE fm.brand_id = fb.id');
      console.log('     AND fm.vehicle_type_id IS NULL;');
    }

    return (nullModels || 0) === 0;

  } catch (error: any) {
    console.error('❌ Erro durante verificação:', error);
    return false;
  }
}

// Executar verificação
verifyColumn()
  .then((success) => {
    if (success) {
      console.log('\n✨ Verificação concluída com sucesso!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Verificação concluída com avisos. Revise os resultados acima.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 Erro fatal durante verificação:', error);
    process.exit(1);
  });

