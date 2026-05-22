import { useQuery } from "@tanstack/react-query";

export interface YTDData {
  year: number;
  ytd_kwh: number;
  months: Array<{ month: string; kwh: number }>;
}

async function fetchYTD(psId: string): Promise<YTDData> {
  const res = await fetch(`/api/solar/plants/${psId}/energy/ytd`);
  if (!res.ok) throw new Error(`YTD fetch failed: ${res.status}`);
  return res.json();
}

export function useSolarYTD(psId: string | undefined) {
  return useQuery({
    queryKey: ["solar-ytd", psId],
    queryFn: () => fetchYTD(psId!),
    enabled: !!psId,
    staleTime: 60 * 60 * 1000,   // 1 hour — monthly aggregates don't change often
  });
}
