import type { SupabaseClient } from '@supabase/supabase-js';

interface VehicleTableInfo {
  columns: Set<string>;
  hasPortugueseColumns: boolean;
  hasEnglishColumns: boolean;
}

type ColumnProbeResult = {
  success: boolean;
  column: string;
};

let cachedInfo: VehicleTableInfo | null = null;
const columnProbeCache = new Map<string, Promise<boolean>>();

const PROBE_COLUMNS = [
  // English schema
  'title',
  'description',
  'brand',
  'model',
  'version',
  'year_model',
  'year_manufacture',
  'vehicle_type',
  'color',
  'fuel_type',
  'transmission',
  'mileage',
  'state',
  'city',
  'current_bid',
  'minimum_bid',
  'auction_type',
  'has_financing',
  'auction_date',
  'fipe_price',
  'fipe_code',
  'fipe_discount_percentage',
  'deal_score',
  'original_url',
  'thumbnail_url',
  'images',
  'auctioneer_id',
  'external_id',
  'lot_number',
  // Portuguese schema
  'titulo',
  'descricao',
  'marca',
  'modelo',
  'modelo_original',
  'versao',
  'ano',
  'ano_modelo',
  'tipo_veiculo',
  'cor',
  'combustivel',
  'cambio',
  'km',
  'estado',
  'cidade',
  'preco_inicial',
  'preco_atual',
  'tipo_leilao',
  'aceita_financiamento',
  'data_leilao',
  'fipe_preco',
  'fipe_codigo',
  'imagens',
  'leiloeiro',
  'leiloeiro_url',
];

async function fetchColumnsViaInformationSchema(client: SupabaseClient): Promise<Set<string> | null> {
  try {
    const { data, error } = await client
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'vehicles');

    if (error) {
      console.warn('[vehicle-table-info] Falha ao consultar information_schema.columns:', error.message ?? error);
      return null;
    }

    if (!data || data.length === 0) {
      return new Set<string>();
    }

    return new Set<string>(data.map((row: any) => row.column_name));
  } catch (err) {
    console.warn('[vehicle-table-info] Erro inesperado ao consultar information_schema.columns:', err);
    return null;
  }
}

async function probeColumn(client: SupabaseClient, column: string): Promise<boolean> {
  if (!columnProbeCache.has(column)) {
    const probePromise = (async () => {
      try {
        const result = await client
          .from('vehicles')
          .select(column)
          .limit(1);

        if (result.error) {
          const code = result.error.code;
          if (code === '42703') {
            return false;
          }
          const message = (result.error.message || '').toLowerCase();
          if (message.includes('column') && message.includes('does not exist')) {
            return false;
          }

          if (message.includes(column.toLowerCase()) && message.includes('does not exist')) {
            return false;
          }

          console.warn(`[vehicle-table-info] Erro ao sondar coluna "${column}":`, result.error);
          return false;
        }

        return true;
      } catch (error) {
        console.warn(`[vehicle-table-info] Erro inesperado ao sondar coluna "${column}":`, error);
        return false;
      }
    })();

    columnProbeCache.set(column, probePromise);
  }

  return columnProbeCache.get(column)!;
}

async function probeColumnsIndividually(client: SupabaseClient): Promise<Set<string>> {
  const probes = await Promise.all(
    PROBE_COLUMNS.map(async (column): Promise<ColumnProbeResult> => {
      const success = await probeColumn(client, column);
      return { column, success };
    })
  );

  const detected = new Set<string>();
  for (const probe of probes) {
    if (probe.success) {
      detected.add(probe.column);
    }
  }

  return detected;
}

export async function getVehicleTableInfo(client: SupabaseClient): Promise<VehicleTableInfo> {
  if (cachedInfo) {
    return cachedInfo;
  }

  let columns = await fetchColumnsViaInformationSchema(client);
  if (!columns || columns.size === 0) {
    columns = await probeColumnsIndividually(client);
  }

  const info: VehicleTableInfo = {
    columns,
    hasPortugueseColumns: ['marca', 'modelo', 'titulo'].some((column) => columns.has(column)),
    hasEnglishColumns: ['brand', 'model', 'title'].some((column) => columns.has(column)),
  };

  cachedInfo = info;
  return info;
}

export function hasVehicleColumn(info: VehicleTableInfo, column: string): boolean {
  return info.columns.has(column);
}

export function resetVehicleTableInfoCache(): void {
  cachedInfo = null;
  columnProbeCache.clear();
}

export type { VehicleTableInfo };

