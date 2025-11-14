'use server';

import { createClient } from '@/lib/supabase/server';

export interface SearchSuggestion {
  type: 'brand' | 'model';
  label: string;
  value: string;
  count: number;
  brand?: string; // Para modelos, incluir a marca
}

export async function getSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const supabase = await createClient();
  const searchQuery = query.toLowerCase();

  try {
    // Buscar marcas que correspondem (usando view que já filtra veículos ativos)
    const { data: brands, error: brandsError } = await supabase
      .from('vehicles_with_auctioneer')
      .select('brand')
      .ilike('brand', `%${searchQuery}%`);

    if (brandsError) {
      console.error('Erro ao buscar marcas:', brandsError);
    }

    // Buscar modelos que correspondem (usando view que já filtra veículos ativos)
    const { data: models, error: modelsError } = await supabase
      .from('vehicles_with_auctioneer')
      .select('brand, model')
      .or(`brand.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%`);

    if (modelsError) {
      console.error('Erro ao buscar modelos:', modelsError);
    }

    // Contar marcas
    const brandCounts = new Map<string, number>();
    brands?.forEach((v: any) => {
      if (v.brand) {
        const brand = v.brand.toUpperCase();
        brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1);
      }
    });

    // Contar modelos (brand + model)
    const modelCounts = new Map<string, { brand: string; count: number }>();
    models?.forEach((v: any) => {
      if (v.brand && v.model) {
        const brand = v.brand.toUpperCase();
        const model = v.model.toUpperCase();
        const key = `${brand} ${model}`;
        const existing = modelCounts.get(key);
        modelCounts.set(key, {
          brand,
          count: (existing?.count || 0) + 1,
        });
      }
    });

    // Criar sugestões de marcas
    const brandSuggestions: SearchSuggestion[] = Array.from(brandCounts.entries())
      .map(([brand, count]) => ({
        type: 'brand' as const,
        label: brand,
        value: brand,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Limitar a 5 marcas

    // Criar sugestões de modelos
    const modelSuggestions: SearchSuggestion[] = Array.from(modelCounts.entries())
      .map(([label, data]) => ({
        type: 'model' as const,
        label,
        value: label,
        brand: data.brand,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Limitar a 10 modelos

    // Combinar e ordenar: marcas primeiro, depois modelos
    const suggestions: SearchSuggestion[] = [
      ...brandSuggestions,
      ...modelSuggestions,
    ];

    return suggestions;
  } catch (error) {
    console.error('Erro ao buscar sugestões:', error);
    return [];
  }
}

