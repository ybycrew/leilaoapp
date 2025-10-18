import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint de teste para verificar se a API está funcionando
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verificar autorização
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET não configurado' },
        { status: 500 }
      );
    }

    // Verificar autorização
    const isAuthorized = authHeader === `Bearer ${cronSecret}`;
    
    if (!isAuthorized) {
      console.error('Tentativa de acesso não autorizado ao endpoint de teste');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🚀 Endpoint de teste funcionando...');

    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Endpoint de teste funcionando corretamente',
      timestamp: new Date().toISOString(),
      executionTimeMs: executionTime,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cronSecretConfigured: !!cronSecret,
      }
    });
  } catch (error: any) {
    console.error('❌ Erro no endpoint de teste:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Test failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Use POST method' }, { status: 405 });
}
