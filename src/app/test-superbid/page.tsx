'use client';

import { useState } from 'react';

export default function TestSuperbidPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test/superbid');
      const data = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.message || 'Erro desconhecido');
      }
    } catch (err) {
      setError('Erro de conexão: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🧪 Teste do Scraper Híbrido - Superbid
          </h1>
          
          <div className="mb-6">
            <button
              onClick={handleTest}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              {isLoading ? '🔄 Testando...' : '🚀 Iniciar Teste'}
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>❌ Erro:</strong> {error}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                <strong>✅ Sucesso:</strong> {result.message}
              </div>
              
              <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                <strong>📊 Estatísticas:</strong>
                <ul className="mt-2 space-y-1">
                  <li>• Veículos encontrados: {result.vehicleCount}</li>
                  <li>• Timestamp: {new Date(result.timestamp).toLocaleString('pt-BR')}</li>
                </ul>
              </div>

              {result.vehicles && result.vehicles.length > 0 && (
                <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded">
                  <strong>🚗 Primeiros veículos encontrados:</strong>
                  <div className="mt-2 space-y-2">
                    {result.vehicles.map((vehicle: any, index: number) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        <div className="font-semibold">{vehicle.title}</div>
                        <div className="text-sm text-gray-600">
                          {vehicle.brand} {vehicle.model} - {vehicle.year_manufacture}
                        </div>
                        <div className="text-sm text-gray-500">
                          Preço: {vehicle.current_bid ? `R$ ${vehicle.current_bid.toLocaleString('pt-BR')}` : 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
