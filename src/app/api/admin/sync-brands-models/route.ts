import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  getAllFipeBrands, 
  getFipeModelsByBrand,
  type FipeBrand,
  type FipeModel 
} from '@/lib/fipe';

/**
 * Endpoint para sincronizar tabela de referência com API FIPE
 * 
 * GET /api/admin/sync-brands-models?vehicleType=carros&syncModels=true
 * 
 * Parâmetros:
 *   - vehicleType: 'carros' | 'motos' | 'caminhoes' (padrão: 'carros')
 *   - syncModels: 'true' | 'false' - se deve sincronizar modelos também (padrão: 'false')
 *   - limit: número máximo de marcas a processar (opcional, para testes)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const vehicleType = (searchParams.get('vehicleType') || 'carros') as 'carros' | 'motos' | 'caminhoes';
    const syncModels = searchParams.get('syncModels') === 'true';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    console.log(`🔄 Iniciando sincronização de marcas/modelos FIPE para ${vehicleType}...`);

    const supabase = await createClient();

    // 1. Buscar todas as marcas da FIPE
    console.log('📋 Buscando marcas da FIPE...');
    const fipeBrands = await getAllFipeBrands(vehicleType);
    
    if (!fipeBrands || fipeBrands.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma marca encontrada na API FIPE' },
        { status: 404 }
      );
    }

    const brandsToProcess = limit ? fipeBrands.slice(0, limit) : fipeBrands;
    console.log(`   Encontradas ${fipeBrands.length} marcas (processando ${brandsToProcess.length})`);

    let brandsSynced = 0;
    let modelsSynced = 0;
    let errors = 0;

    // 2. Sincronizar cada marca
    for (let i = 0; i < brandsToProcess.length; i++) {
      const brand = brandsToProcess[i];
      
      try {
        // Inserir ou atualizar marca na tabela de referência
        const { error: brandError } = await supabase
          .from('brand_model_reference')
          .upsert({
            vehicle_type: vehicleType,
            fipe_brand_code: brand.codigo,
            fipe_brand_name: brand.nome,
            fipe_model_code: null,
            fipe_model_name: null,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'vehicle_type,fipe_brand_code,fipe_model_code',
          });

        if (brandError) {
          console.error(`   ❌ Erro ao sincronizar marca ${brand.nome}:`, brandError.message);
          errors++;
        } else {
          brandsSynced++;
          
          // 3. Se syncModels=true, buscar e sincronizar modelos da marca
          if (syncModels) {
            try {
              const models = await getFipeModelsByBrand(brand.codigo, vehicleType);
              
              for (const model of models) {
                const { error: modelError } = await supabase
                  .from('brand_model_reference')
                  .upsert({
                    vehicle_type: vehicleType,
                    fipe_brand_code: brand.codigo,
                    fipe_brand_name: brand.nome,
                    fipe_model_code: model.codigo,
                    fipe_model_name: model.nome,
                    is_active: true,
                    updated_at: new Date().toISOString(),
                  }, {
                    onConflict: 'vehicle_type,fipe_brand_code,fipe_model_code',
                  });

                if (modelError) {
                  console.error(`      ❌ Erro ao sincronizar modelo ${model.nome}:`, modelError.message);
                  errors++;
                } else {
                  modelsSynced++;
                }
              }
              
              if (models.length > 0) {
                console.log(`   ✅ ${brand.nome}: ${models.length} modelos sincronizados`);
              }
            } catch (modelError: any) {
              console.error(`   ⚠️  Erro ao buscar modelos de ${brand.nome}:`, modelError.message);
              errors++;
            }
          }

          // Pequeno delay para não sobrecarregar a API FIPE
          if (i < brandsToProcess.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      } catch (error: any) {
        console.error(`   ❌ Erro ao processar marca ${brand.nome}:`, error.message);
        errors++;
      }

      // Log de progresso a cada 10 marcas
      if ((i + 1) % 10 === 0) {
        console.log(`   Progresso: ${i + 1}/${brandsToProcess.length} marcas processadas`);
      }
    }

    // 4. Desativar marcas/modelos que não estão mais na FIPE
    // (opcional - pode ser feito em uma execução separada)

    const response = {
      success: true,
      vehicleType,
      syncModels,
      stats: {
        totalBrands: fipeBrands.length,
        processedBrands: brandsToProcess.length,
        brandsSynced,
        modelsSynced,
        errors,
      },
      message: `Sincronização concluída: ${brandsSynced} marcas e ${modelsSynced} modelos sincronizados`,
    };

    console.log('✅ Sincronização concluída:', response.message);
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ Erro na sincronização:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro ao sincronizar marcas/modelos',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST para forçar sincronização completa (marcas + modelos)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const vehicleType = (body.vehicleType || 'carros') as 'carros' | 'motos' | 'caminhoes';
    const syncModels = body.syncModels !== false; // padrão: true

    // Redirecionar para GET com parâmetros
    const url = new URL(request.url);
    url.searchParams.set('vehicleType', vehicleType);
    url.searchParams.set('syncModels', syncModels.toString());
    if (body.limit) {
      url.searchParams.set('limit', body.limit.toString());
    }

    return GET(new NextRequest(url.toString()));
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro ao processar requisição',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

