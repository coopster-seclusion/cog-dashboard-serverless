import { useQuery } from "@tanstack/react-query";

export interface YTDData {
  ytd_kwh: number;
}

async function fetchYTD(psId: string): Promise<YTDData> {
  const res = await fetch(`/api/solar/plants/${psId}/energy/ytd`);
  if (!res.ok) throw new Error(`YTD fetch failed: ${res.status}`);
  const json = await res.json();
  return { ytd_kwh: json.ytd_kwh };
}

export function useSolarYTD(psId: string | undefined) {
  return useQuery({
    queryKey: ["solar-ytd", psId],
    queryFn: () => fetchYTD(psId!),
    enabled: !!psId,
    staleTime: 60 * 60 * 1000,
  });
}
