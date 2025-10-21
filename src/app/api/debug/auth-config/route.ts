import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    config: {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configurado' : 'não configurado',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'configurado' : 'não configurado',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'configurado' : 'não configurado',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configurado' : 'não configurado',
    },
    expectedCallbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.ybybid.com.br'}/api/auth/callback`,
    timestamp: new Date().toISOString()
  });
}
