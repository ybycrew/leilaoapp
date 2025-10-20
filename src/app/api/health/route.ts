import { NextResponse } from 'next/server';

/**
 * Endpoint de health check super simples
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'API is working'
  });
}

export async function POST() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'API is working'
  });
}
