import { useQuery } from "@tanstack/react-query";
import {
  fetchEnergyQuantities,
  fetchNodes,
  fetchPrices,
  fetchReserveQuantities,
  fetchSchedules,
  fetchSpread,
  type EnergyParams,
  type PricesParams,
  type ReserveParams,
  type SpreadParams,
} from "@/lib/api";
import { useDashboard, type WITSState } from "@/context/WITSContext";

// ---------------------------------------------------------------------------
// Map timeRange + custom dates → back / from / to query params
// ---------------------------------------------------------------------------

function getTimeParams(state: WITSState): {
  back?: number;
  from?: string;
  to?: string;
} {
  if (state.timeRange === "CUSTOM") {
    return { from: state.customFrom, to: state.customTo };
  }
  if (state.timeRange === "7D") {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    return { from, to };
  }
  const backMap: Record<string, number> = {
    LIVE: 2,
    "1H": 2,
    "6H": 12,
    "24H": 48,
  };
  return { back: backMap[state.timeRange] ?? 2 };
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Spot / pre-dispatch prices for one or more nodes.
 * Context supplies schedule, marketType, nodes, and time window.
 * Pass overrides to pin any param regardless of context.
 */
export function usePrices(overrides: Partial<PricesParams> = {}, enabled = true) {
  const { state } = useDashboard();
  const params: PricesParams = {
    schedule: state.schedule,
    marketType: state.marketType,
    nodes: state.nodes.join(","),
    ...getTimeParams(state),
    ...overrides,
  };
  return useQuery({
    queryKey: ["prices", params],
    queryFn: () => fetchPrices(params),
    enabled,
    refetchInterval: state.autoRefresh ? state.refreshInterval * 1000 : false,
    staleTime: 25_000,
  });
}

/**
 * Price spread between two explicit nodes.
 */
export function usePriceSpread(
  nodeA: string,
  nodeB: string,
  overrides: Partial<SpreadParams> = {},
  enabled = true,
) {
  const { state } = useDashboard();
  const params: SpreadParams = {
    nodeA,
    nodeB,
    schedule: state.schedule,
    marketType: state.marketType,
    ...getTimeParams(state),
    ...overrides,
  };
  return useQuery({
    queryKey: ["prices", "spread", params],
    queryFn: () => fetchSpread(params),
    enabled,
    refetchInterval: state.autoRefresh ? state.refreshInterval * 1000 : false,
    staleTime: 25_000,
  });
}

/**
 * Island generation / load quantities.
 */
export function useEnergyQuantities(
  overrides: Partial<EnergyParams> = {},
  enabled = true,
) {
  const { state } = useDashboard();
  const params: EnergyParams = {
    schedule: state.schedule,
    island: state.island === "BOTH" ? undefined : state.island,
    ...getTimeParams(state),
    ...overrides,
  };
  return useQuery({
    queryKey: ["quantities", "energy", params],
    queryFn: () => fetchEnergyQuantities(params),
    enabled,
    refetchInterval: state.autoRefresh ? state.refreshInterval * 1000 : false,
    staleTime: 25_000,
  });
}

/**
 * Reserve MW / price data.
 */
export function useReserveQuantities(
  runClass: string,
  overrides: Partial<ReserveParams> = {},
  enabled = true,
) {
  const { state } = useDashboard();
  const params: ReserveParams = {
    schedule: state.schedule,
    runClass,
    island: state.island === "BOTH" ? undefined : state.island,
    ...getTimeParams(state),
    ...overrides,
  };
  return useQuery({
    queryKey: ["quantities", "reserves", params],
    queryFn: () => fetchReserveQuantities(params),
    enabled,
    refetchInterval: state.autoRefresh ? state.refreshInterval * 1000 : false,
    staleTime: 25_000,
  });
}

/** Schedule list — nearly static. */
export function useSchedules() {
  return useQuery({
    queryKey: ["schedules"],
    queryFn: fetchSchedules,
    staleTime: 5 * 60_000,
  });
}

/** Node list — static. */
export function useNodes() {
  return useQuery({
    queryKey: ["nodes"],
    queryFn: fetchNodes,
    staleTime: Infinity,
  });
}
