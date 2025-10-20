import { NextResponse } from 'next/server';

/**
 * Endpoint de status super simples para forçar redeploy
 */
export async function GET() {
  return NextResponse.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    message: 'API is online and working'
  });
}
