#!/usr/bin/env tsx

/**
 * Script de Debug para verificar lookup de modelos
 * Verifica o que está sendo encontrado no banco para casos problemáticos
 */

import { createClient } from '@supabase/supabase-js';
import { buildSearchKey, extractModelBase } from '../lib/fipe-normalization';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TestCase {
  brand: string;
  model: string;
  expectedType: string;
}

const testCases: TestCase[] = [
  { brand: 'Volvo', model: 'FH', expectedType: 'caminhao' },
  { brand: 'Chevrolet', model: 'S10', expectedType: 'carro' },
  { brand: 'GM', model: 'S10', expectedType: 'carro' }, // GM também pode ser usado
];

async function debugLookup(brand: string, model: string, expectedType: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 Debug: ${brand} ${model} (esperado: ${expectedType})`);
  console.log('='.repeat(60));

  // 1. Buscar marca
  const brandSearchKey = buildSearchKey(brand);
  console.log(`\n1️⃣ Buscando marca: "${brand}" (searchKey: "${brandSearchKey}")`);
  
  const { data: brands, error: brandError } = await supabase
    .from('fipe_brands')
    .select('id, name, name_upper, search_name, vehicle_type_id')
    .eq('search_name', brandSearchKey);

  if (brandError) {
    console.error('❌ Erro ao buscar marca:', brandError);
    return;
  }

  if (!brands || brands.length === 0) {
    console.log('⚠️  Marca não encontrada por search_name, tentando name_upper...');
    const { data: brandsPartial } = await supabase
      .from('fipe_brands')
      .select('id, name, name_upper, search_name, vehicle_type_id')
      .ilike('name_upper', `%${brand.toUpperCase()}%`);
    
    if (brandsPartial && brandsPartial.length > 0) {
      brands.push(...brandsPartial);
    }
  }

  if (!brands || brands.length === 0) {
    console.log('❌ Marca não encontrada no banco!');
    return;
  }

  console.log(`✅ Encontradas ${brands.length} marca(s):`);
  for (const b of brands) {
    const { data: vehicleType } = await supabase
      .from('fipe_vehicle_types')
      .select('slug')
      .eq('id', b.vehicle_type_id)
      .maybeSingle();
    
    console.log(`   - ${b.name_upper} (ID: ${b.id}, Tipo: ${vehicleType?.slug || 'N/A'})`);
  }

  const brandIds = brands.map(b => b.id);

  // 2. Buscar modelo
  const modelBase = extractModelBase(model);
  const modelSearchKeys = [
    modelBase.baseSearchName,
    buildSearchKey(model),
    buildSearchKey(modelBase.baseNameUpper)
  ].filter(k => k && k.length > 0);

  console.log(`\n2️⃣ Buscando modelo: "${model}"`);
  console.log(`   Search keys: ${modelSearchKeys.join(', ')}`);

  // Buscar dentro das marcas encontradas
  for (const key of modelSearchKeys) {
    console.log(`\n   🔎 Buscando por chave: "${key}"`);
    
    // Busca exata dentro das marcas
    const { data: exactMatch, error: exactError } = await supabase
      .from('fipe_models')
      .select('id, name, name_upper, base_name, base_name_upper, base_search_name, fipe_code, vehicle_type_id, brand_id')
      .eq('base_search_name', key)
      .in('brand_id', brandIds)
      .not('vehicle_type_id', 'is', null);

    if (!exactError && exactMatch && exactMatch.length > 0) {
      console.log(`   ✅ Match exato encontrado: ${exactMatch.length} modelo(s)`);
      for (const m of exactMatch) {
        const { data: vehicleType } = await supabase
          .from('fipe_vehicle_types')
          .select('slug')
          .eq('id', m.vehicle_type_id)
          .maybeSingle();
        
        const { data: brandData } = await supabase
          .from('fipe_brands')
          .select('name_upper')
          .eq('id', m.brand_id)
          .maybeSingle();

        console.log(`      - ${m.name_upper} (Marca: ${brandData?.name_upper || 'N/A'}, Tipo: ${vehicleType?.slug || 'N/A'}, base_search: ${m.base_search_name})`);
      }
    } else {
      console.log(`   ⚠️  Nenhum match exato encontrado`);
    }

    // Busca parcial dentro das marcas
    if (key.length >= 3) {
      const { data: partialMatch, error: partialError } = await supabase
        .from('fipe_models')
        .select('id, name, name_upper, base_name, base_name_upper, base_search_name, fipe_code, vehicle_type_id, brand_id')
        .ilike('base_search_name', `%${key}%`)
        .in('brand_id', brandIds)
        .not('vehicle_type_id', 'is', null)
        .limit(10);

      if (!partialError && partialMatch && partialMatch.length > 0) {
        console.log(`   ✅ Match parcial encontrado: ${partialMatch.length} modelo(s)`);
        for (const m of partialMatch) {
          const { data: vehicleType } = await supabase
            .from('fipe_vehicle_types')
            .select('slug')
            .eq('id', m.vehicle_type_id)
            .maybeSingle();
          
          const { data: brandData } = await supabase
            .from('fipe_brands')
            .select('name_upper')
            .eq('id', m.brand_id)
            .maybeSingle();

          console.log(`      - ${m.name_upper} (Marca: ${brandData?.name_upper || 'N/A'}, Tipo: ${vehicleType?.slug || 'N/A'}, base_search: ${m.base_search_name})`);
        }
      }
    }
  }

  // 3. Buscar globalmente (sem filtro de marca) para ver o que existe
  console.log(`\n3️⃣ Busca global (sem filtro de marca) para "${modelSearchKeys[0]}"`);
  const { data: globalMatch, error: globalError } = await supabase
    .from('fipe_models')
    .select('id, name, name_upper, base_name, base_name_upper, base_search_name, fipe_code, vehicle_type_id, brand_id')
    .eq('base_search_name', modelSearchKeys[0])
    .not('vehicle_type_id', 'is', null)
    .limit(20);

  if (!globalError && globalMatch && globalMatch.length > 0) {
    console.log(`   Encontrados ${globalMatch.length} modelo(s) globalmente:`);
    for (const m of globalMatch) {
      const { data: vehicleType } = await supabase
        .from('fipe_vehicle_types')
        .select('slug')
        .eq('id', m.vehicle_type_id)
        .maybeSingle();
      
      const { data: brandData } = await supabase
        .from('fipe_brands')
        .select('name_upper')
        .eq('id', m.brand_id)
        .maybeSingle();

      const isInBrand = brandIds.includes(m.brand_id);
      console.log(`      ${isInBrand ? '✅' : '❌'} ${m.name_upper} (Marca: ${brandData?.name_upper || 'N/A'}, Tipo: ${vehicleType?.slug || 'N/A'}, base_search: ${m.base_search_name})`);
    }
  }
}

async function main() {
  console.log('🔍 Iniciando debug de lookup de modelos...\n');

  for (const testCase of testCases) {
    await debugLookup(testCase.brand, testCase.model, testCase.expectedType);
  }

  console.log('\n✨ Debug concluído!');
}

main().catch(console.error);

