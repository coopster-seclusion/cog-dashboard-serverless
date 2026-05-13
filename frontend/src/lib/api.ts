const BASE = "/api";

type QueryParams = Record<string, string | number | boolean | undefined | null>;

async function get<T>(path: string, params?: QueryParams): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Response types (mirror backend models.py)
// ---------------------------------------------------------------------------

export interface NodePrices {
  prices: (number | null)[];
  timestamps: (string | null)[];
}

export interface PricesResponse {
  schedule: string;
  market_type: string;
  nodes: Record<string, NodePrices>;
}

export interface SpreadResponse {
  nodeA: string;
  nodeB: string;
  schedule: string;
  timestamps: (string | null)[];
  priceA: (number | null)[];
  priceB: (number | null)[];
  spread: (number | null)[];
}

export interface ScheduleInfo {
  code: string;
  label: string;
  supports_forward: boolean;
  market_types: string[];
  description: string;
}

export interface SchedulesResponse {
  schedules: ScheduleInfo[];
}

export interface NodesResponse {
  nodes: Record<string, string>;
}

export interface EnergyRecord {
  timestamp: string | null;
  trading_period: number | null;
  island: string | null;
  load: number | null;
  generation: number | null;
  intermittent_generation: number | null;
  total_bids: number | null;
  total_offers: number | null;
  intermittent_offers: number | null;
}

export interface EnergyQuantitiesResponse {
  schedule: string;
  island: string | null;
  records: EnergyRecord[];
}

export interface ReserveRecord {
  timestamp: string | null;
  trading_period: number | null;
  island: string | null;
  run_type: string | null;
  reserve_class: string | null;
  run_class: string | null;
  price: number | null;
  reserve_mw: number | null;
  risk_mw: number | null;
  risk_adjustment_factor: number | null;
}

export interface ReserveQuantitiesResponse {
  schedule: string;
  run_class: string;
  island: string | null;
  records: ReserveRecord[];
}

// ---------------------------------------------------------------------------
// Param types
// ---------------------------------------------------------------------------

export interface PricesParams {
  schedule?: string;
  marketType?: string;
  nodes?: string;
  back?: number;
  forward?: number;
  island?: string;
  from?: string;
  to?: string;
}

export interface SpreadParams {
  nodeA: string;
  nodeB: string;
  schedule?: string;
  marketType?: string;
  back?: number;
  forward?: number;
}

export interface EnergyParams {
  schedule: string;
  island?: string;
  back?: number;
  forward?: number;
  from?: string;
  to?: string;
}

export interface ReserveParams {
  schedule: string;
  runClass: string;
  island?: string;
  back?: number;
  forward?: number;
  from?: string;
  to?: string;
}

// ---------------------------------------------------------------------------
// Fetch functions
// ---------------------------------------------------------------------------

export const fetchPrices = (params: PricesParams = {}) =>
  get<PricesResponse>(`${BASE}/prices`, params as QueryParams);

export const fetchSpread = (params: SpreadParams) =>
  get<SpreadResponse>(`${BASE}/prices/spread`, params as QueryParams);

export const fetchSchedules = () =>
  get<SchedulesResponse>(`${BASE}/schedules`);

export const fetchNodes = () =>
  get<NodesResponse>(`${BASE}/nodes`);

export const fetchEnergyQuantities = (params: EnergyParams) =>
  get<EnergyQuantitiesResponse>(`${BASE}/quantities/energy`, params as QueryParams);

export const fetchReserveQuantities = (params: ReserveParams) =>
  get<ReserveQuantitiesResponse>(`${BASE}/quantities/reserves`, params as QueryParams);
