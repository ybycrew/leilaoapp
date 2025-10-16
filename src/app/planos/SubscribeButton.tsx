'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { createCheckoutSession } from './actions';

interface SubscribeButtonProps {
  priceId?: string;
  cta: string;
  variant?: 'default' | 'outline';
  isFree?: boolean;
}

export function SubscribeButton({ priceId, cta, variant = 'default', isFree = false }: SubscribeButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (isFree) {
      // Plano gratuito, redirecionar para registro
      window.location.href = '/registrar';
      return;
    }

    if (!priceId) {
      alert('ID do plano não configurado. Entre em contato com o suporte.');
      return;
    }

    setLoading(true);
    
    try {
      await createCheckoutSession(priceId);
      // Se chegou aqui sem redirecionar, algo deu errado
    } catch (error: any) {
      // O redirect() do Next.js lança um erro especial que não deve ser tratado aqui
      // Apenas tratamos erros reais
      if (error.message && !error.message.includes('NEXT_REDIRECT')) {
        alert(error.message || 'Erro ao processar pagamento. Tente novamente.');
        setLoading(false);
      }
      // Se for NEXT_REDIRECT, deixa propagar (é o comportamento esperado)
    }
  };

  return (
    <Button
      onClick={handleClick}
      className="w-full"
      size="lg"
      variant={variant}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processando...
        </>
      ) : (
        cta
      )}
    </Button>
  );
}

