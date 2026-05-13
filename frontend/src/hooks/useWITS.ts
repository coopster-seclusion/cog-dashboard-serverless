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

export function usePrices(params: PricesParams = {}, enabled = true) {
  return useQuery({
    queryKey: ["prices", params],
    queryFn: () => fetchPrices(params),
    enabled,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
}

export function usePriceSpread(params: SpreadParams, enabled = true) {
  return useQuery({
    queryKey: ["prices", "spread", params],
    queryFn: () => fetchSpread(params),
    enabled,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
}

export function useSchedules() {
  return useQuery({
    queryKey: ["schedules"],
    queryFn: fetchSchedules,
    staleTime: 5 * 60_000,
  });
}

export function useNodes() {
  return useQuery({
    queryKey: ["nodes"],
    queryFn: fetchNodes,
    staleTime: Infinity,
  });
}

export function useEnergyQuantities(params: EnergyParams, enabled = true) {
  return useQuery({
    queryKey: ["quantities", "energy", params],
    queryFn: () => fetchEnergyQuantities(params),
    enabled,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
}

export function useReserveQuantities(params: ReserveParams, enabled = true) {
  return useQuery({
    queryKey: ["quantities", "reserves", params],
    queryFn: () => fetchReserveQuantities(params),
    enabled,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
}
