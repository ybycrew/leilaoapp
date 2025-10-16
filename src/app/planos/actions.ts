'use server';

import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { redirect } from 'next/navigation';

export async function createCheckoutSession(priceId: string) {
  const supabase = await createClient();
  
  // Verificar se o usuário está autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    // Redirecionar para login se não estiver autenticado
    redirect('/entrar?redirect=/planos');
  }

  // Criar sessão de checkout no Stripe
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    client_reference_id: user.id,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/planos/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/planos?canceled=true`,
    metadata: {
      user_id: user.id,
    },
  });

  if (!session.url) {
    throw new Error('Erro ao criar sessão de checkout');
  }

  // Redirecionar para o checkout do Stripe
  // O redirect() lança um erro especial que deve ser propagado
  redirect(session.url);
}

