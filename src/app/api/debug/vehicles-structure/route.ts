import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Buscar informações sobre a estrutura da tabela vehicles
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'vehicles')
      .eq('table_schema', 'public')
      .order('ordinal_position');

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Buscar um veículo de exemplo para ver os tipos reais
    const { data: sampleVehicle, error: sampleError } = await supabase
      .from('vehicles')
      .select('*')
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      columns,
      sampleVehicle,
      sampleError: sampleError?.message || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
