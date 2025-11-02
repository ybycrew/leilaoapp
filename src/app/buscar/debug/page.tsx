import { debugVehiclesTable } from '../debug-actions';

export default async function DebugPage() {
  const debugInfo = await debugVehiclesTable();

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Debug - Tabela Vehicles</h1>
      
      {debugInfo.error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          <strong>Erro:</strong> {debugInfo.error}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Estatísticas</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Total de veículos: <strong>{debugInfo.total}</strong></li>
              <li>Veículos com marca preenchida: <strong>{debugInfo.withMarca}</strong></li>
              <li>Veículos com modelo preenchido: <strong>{debugInfo.withModelo}</strong></li>
              <li>Veículos com estado preenchido: <strong>{debugInfo.withEstado}</strong></li>
            </ul>
          </div>

          {debugInfo.sample && debugInfo.sample.length > 0 && (
            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-semibold mb-2">Amostra de Veículos (primeiros 5)</h2>
              <div className="space-y-2">
                {debugInfo.sample.map((vehicle: any) => (
                  <div key={vehicle.id} className="border-b pb-2">
                      <div className="font-mono text-sm">
                        <div><strong>ID:</strong> {vehicle.id}</div>
                        <div><strong>Título:</strong> {vehicle.titulo || '(vazio)'}</div>
                        <div><strong>Brand:</strong> {vehicle.brand || '(null)'}</div>
                        <div><strong>Model:</strong> {vehicle.model || '(null)'}</div>
                        <div><strong>State:</strong> {vehicle.state || '(null)'}</div>
                        <div><strong>City:</strong> {vehicle.city || '(null)'}</div>
                      </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

