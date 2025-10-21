'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Login com Google OAuth
 * Redireciona para o fluxo de autenticação do Google
 */
export async function signInWithGoogle() {
  const supabase = await createClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.ybybid.com.br'}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('Erro no login com Google:', error);
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url); // Redireciona para o Google
  }
}

/**
 * Login com email e senha
 */
export async function signInWithEmail(email: string, password: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, user: data.user };
}

/**
 * Cadastro com email e senha
 */
export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.ybybid.com.br'}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, user: data.user };
}

/**
 * Logout
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/entrar');
}


