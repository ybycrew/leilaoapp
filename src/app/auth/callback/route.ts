import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Rota de callback para autenticação OAuth (Google, etc)
 * URL de redirecionamento para configurar no Google Cloud Console:
 * - Local: http://localhost:3000/auth/callback
 * - Produção: https://seudominio.com/auth/callback
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    
    // Trocar o código por uma sessão
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Erro na autenticação:', error);
      // Redirecionar para página de login com erro
      return NextResponse.redirect(`${origin}/entrar?error=auth_failed`);
    }
  }

  // Redirecionar para o dashboard após sucesso
  return NextResponse.redirect(`${origin}/dashboard`);
}

