'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Função de diagnóstico para verificar a estrutura e dados da tabela vehicles
 * Use apenas para debug - não usar em produção
 */
export async function debugVehiclesTable() {
  const supabase = await createClient();

  try {
    // 1. Verificar total de veículos
    const { count, error: countError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return { error: `Erro ao contar veículos: ${countError.message}` };
    }

    // 2. Buscar alguns veículos para ver estrutura
    const { data: sampleData, error: sampleError } = await supabase
      .from('vehicles')
      .select('id, brand, model, state, city, titulo')
      .limit(5);

    if (sampleError) {
      return { error: `Erro ao buscar amostra: ${sampleError.message}` };
    }

    // 3. Contar veículos com marca não-nula
    const { count: marcaCount } = await supabase
      .from('vehicles')
      .select('brand', { count: 'exact', head: true })
      .not('brand', 'is', null);

    // 4. Contar veículos com modelo não-nulo
    const { count: modeloCount } = await supabase
      .from('vehicles')
      .select('model', { count: 'exact', head: true })
      .not('model', 'is', null);

    // 5. Contar veículos com estado não-nulo
    const { count: estadoCount } = await supabase
      .from('vehicles')
      .select('state', { count: 'exact', head: true })
      .not('state', 'is', null);

    return {
      total: count || 0,
      withMarca: marcaCount || 0,
      withModelo: modeloCount || 0,
      withEstado: estadoCount || 0,
      sample: sampleData || [],
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

