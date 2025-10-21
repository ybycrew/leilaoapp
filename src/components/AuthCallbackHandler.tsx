'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

function AuthCallbackHandlerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const code = searchParams.get('code');
      
      if (code) {
        try {
          // Trocar o código por uma sessão
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Erro na autenticação:', error);
            // Redirecionar para login com erro
            router.push('/entrar?error=auth_failed');
            return;
          }
          
          // Redirecionar para dashboard após sucesso
          router.push('/dashboard');
        } catch (error) {
          console.error('Erro no callback:', error);
          router.push('/entrar?error=auth_failed');
        }
      }
    };

    handleAuthCallback();
  }, [searchParams, router, supabase.auth]);

  // Não renderiza nada, apenas processa o callback
  return null;
}

export function AuthCallbackHandler() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackHandlerInner />
    </Suspense>
  );
}
