import { useQuery } from "@tanstack/react-query";

interface MeasurePoint {
  value: number | string | null;
  unit: string | null;
  name: string | null;
}

export interface PlantRealtime {
  power: MeasurePoint | null;
  daily_yield: MeasurePoint | null;
  total_yield: MeasurePoint | null;
  battery_soc: MeasurePoint | null;
}

async function fetchRealtime(psId: string): Promise<PlantRealtime | null> {
  const res = await fetch(`/api/solar/plants/${psId}/realtime`);
  if (!res.ok) throw new Error(`Realtime fetch failed: ${res.status}`);
  const data = await res.json();
  return (data.plants?.[psId] as PlantRealtime) ?? null;
}

export function useSolarRealtime(psId: string | undefined) {
  return useQuery({
    queryKey: ["solar-realtime", psId],
    queryFn: () => fetchRealtime(psId!),
    enabled: !!psId,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: true,
    notifyOnChangeProps: "all",
  });
}
