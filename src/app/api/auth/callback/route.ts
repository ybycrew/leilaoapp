import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  console.log('🔍 [AUTH CALLBACK] Endpoint chamado:', {
    url: request.url,
    code: code ? `${code.substring(0, 8)}...` : 'null',
    origin,
    searchParams: Object.fromEntries(requestUrl.searchParams.entries())
  });

  if (code) {
    const supabase = await createClient();
    
    try {
      console.log('🔄 [AUTH CALLBACK] Tentando trocar código por sessão...');
      
      // Trocar o código por uma sessão
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('❌ [AUTH CALLBACK] Erro na autenticação:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        // Redirecionar para página de login com erro
        return NextResponse.redirect(`${origin}/entrar?error=auth_failed`);
      }
      
      console.log('✅ [AUTH CALLBACK] Autenticação bem-sucedida:', {
        user: data.user?.id ? `${data.user.id.substring(0, 8)}...` : 'null',
        session: data.session ? 'presente' : 'ausente'
      });
      
      // Redirecionar para dashboard após sucesso
      return NextResponse.redirect(`${origin}/dashboard`);
    } catch (error) {
      console.error('💥 [AUTH CALLBACK] Erro no callback:', error);
      return NextResponse.redirect(`${origin}/entrar?error=auth_failed`);
    }
  }

  console.log('⚠️ [AUTH CALLBACK] Nenhum código encontrado, redirecionando para login');
  // Se não há código, redirecionar para login
  return NextResponse.redirect(`${origin}/entrar`);
}
