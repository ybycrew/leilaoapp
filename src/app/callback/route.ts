import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  console.log('🔄 [CALLBACK REDIRECT] Redirecionando de /callback para /api/auth/callback:', {
    url: request.url,
    code: code ? `${code.substring(0, 8)}...` : 'null',
    origin
  });

  // Redirecionar para o endpoint correto
  const redirectUrl = new URL('/api/auth/callback', origin);
  
  // Preservar todos os parâmetros de query
  requestUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value);
  });

  return NextResponse.redirect(redirectUrl.toString());
}
