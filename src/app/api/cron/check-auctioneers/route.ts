import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Endpoint para verificar se os leiloeiros existem no banco
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autorização
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET não configurado' },
        { status: 500 }
      );
    }

    const isAuthorized = authHeader === `Bearer ${cronSecret}`;
    
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    return NextResponse.json({
      success: true,
      auctioneers: auctioneers || [],
      count: auctioneers?.length || 0,
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
