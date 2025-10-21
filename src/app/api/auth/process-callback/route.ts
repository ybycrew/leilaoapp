import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json({ error: 'Código não fornecido' }, { status: 400 });
    }

    console.log('🔄 [PROCESS CALLBACK] Processando código via API:', {
      code: `${code.substring(0, 8)}...`
    });

    const supabase = await createClient();
    
    // Trocar o código por uma sessão
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('❌ [PROCESS CALLBACK] Erro na autenticação:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
      
      return NextResponse.json({ 
        error: 'Falha na autenticação',
        details: error.message 
      }, { status: 400 });
    }
    
    console.log('✅ [PROCESS CALLBACK] Autenticação bem-sucedida:', {
      user: data.user?.id ? `${data.user.id.substring(0, 8)}...` : 'null',
      session: data.session ? 'presente' : 'ausente'
    });
    
    return NextResponse.json({ 
      success: true,
      user: data.user?.id,
      redirectTo: '/dashboard'
    });
    
  } catch (error) {
    console.error('💥 [PROCESS CALLBACK] Erro no processamento:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}
