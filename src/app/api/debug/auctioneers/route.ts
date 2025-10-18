import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Endpoint de debug para verificar leiloeiros (sem autorização)
 */
export async function GET() {
  try {
    // Inicializar Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Variáveis do Supabase não configuradas' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar todos os leiloeiros
    const { data: auctioneers, error } = await supabase
      .from('auctioneers')
      .select('*')
      .order('name');

    if (error) {
      return NextResponse.json(
        { error: 'Erro ao buscar leiloeiros', details: error },
        { status: 500 }
      );
    }

    // Buscar especificamente "Sodré Santoro"
    const { data: sodreSantoro, error: sodreError } = await supabase
      .from('auctioneers')
      .select('*')
      .eq('name', 'Sodré Santoro')
      .single();

    return NextResponse.json({
      success: true,
      totalAuctioneers: auctioneers?.length || 0,
      allAuctioneers: auctioneers || [],
      sodreSantoro: {
        exists: !!sodreSantoro,
        data: sodreSantoro,
        error: sodreError
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Erro interno',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
