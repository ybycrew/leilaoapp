import { NextResponse } from 'next/server';

/**
 * Endpoint super simples para ping - sem autenticação
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Ping successful'
  });
}

export async function POST() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Ping successful'
  });
}
