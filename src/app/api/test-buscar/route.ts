import { NextRequest, NextResponse } from 'next/server';
import { searchVehicles } from '@/app/buscar/actions';

export async function GET(request: NextRequest) {
  try {
    // Testar busca sem filtros
    const result = await searchVehicles({
      orderBy: 'deal_score',
      limit: 10,
    });

    return NextResponse.json({
      success: true,
      message: 'Teste da função searchVehicles',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
