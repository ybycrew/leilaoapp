import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    
    try {
      // Trocar o código por uma sessão
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Erro na autenticação:', error);
        // Redirecionar para página de login com erro
        return NextResponse.redirect(`${origin}/entrar?error=auth_failed`);
      }
      
      // Redirecionar para dashboard após sucesso
      return NextResponse.redirect(`${origin}/dashboard`);
    } catch (error) {
      console.error('Erro no callback:', error);
      return NextResponse.redirect(`${origin}/entrar?error=auth_failed`);
    }
  }

  // Se não há código, redirecionar para login
  return NextResponse.redirect(`${origin}/entrar`);
}
