'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function HomepageAuthHandlerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    
    if (code) {
      console.log('🔍 [HOMEPAGE AUTH] Código encontrado na homepage:', {
        code: `${code.substring(0, 8)}...`
      });
      
      const processAuth = async () => {
        try {
          // Primeiro, tentar processar via API
          const response = await fetch('/api/auth/process-callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log('✅ [HOMEPAGE AUTH] Autenticação processada via API:', result);
            router.replace('/dashboard');
            return;
          }
        } catch (error) {
          console.error('❌ [HOMEPAGE AUTH] Erro ao processar via API:', error);
        }

        // Fallback: redirecionar para /callback
        console.log('🔄 [HOMEPAGE AUTH] Fallback: redirecionando para /callback');
        const callbackUrl = new URL('/callback', window.location.origin);
        callbackUrl.searchParams.set('code', code);
        
        // Preservar outros parâmetros se houver
        searchParams.forEach((value, key) => {
          if (key !== 'code') {
            callbackUrl.searchParams.set(key, value);
          }
        });
        
        router.replace(callbackUrl.toString());
      };

      processAuth();
    }
  }, [searchParams, router]);

  return null;
}

export function HomepageAuthHandler() {
  return (
    <Suspense fallback={null}>
      <HomepageAuthHandlerInner />
    </Suspense>
  );
}
