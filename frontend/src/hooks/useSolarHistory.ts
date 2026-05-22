import { useQuery } from "@tanstack/react-query";

export type HistoryPeriod = "day" | "week" | "month" | "year";

export interface HistoryPoint {
  label: string;
  value: number;
}

export interface HistoryData {
  points: HistoryPoint[];
  unit: "kW" | "kWh";
}

type RawFrame = { timestamp: string; power?: number | null; daily_yield?: number | null };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toApiTs(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

async function fetchHistory(psId: string, start: string, end: string, interval: number): Promise<RawFrame[]> {
  const params = new URLSearchParams({ start, end, interval: String(interval) });
  const res = await fetch(`/api/solar/plants/${psId}/history?${params}`);
  if (!res.ok) throw new Error(`History fetch failed: ${res.status}`);
  const json = await res.json();
  const plants: Record<string, RawFrame[]> = json.plants ?? {};
  return Object.values(plants).flat();
}

async function fetchYields(psId: string, start: Date, end: Date): Promise<Array<{ date: string; kwh: number }>> {
  const params = new URLSearchParams({ start: toDateStr(start), end: toDateStr(end) });
  const res = await fetch(`/api/solar/plants/${psId}/yields?${params}`);
  if (!res.ok) throw new Error(`Yields fetch failed: ${res.status}`);
  const json = await res.json();
  return json.yields ?? [];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toDayPoints(raw: RawFrame[]): HistoryPoint[] {
  return raw
    .filter(r => r.power != null)
    .map(r => ({
      label: `${r.timestamp.slice(8, 10)}:${r.timestamp.slice(10, 12)}`,
      value: Math.round((r.power! / 1000) * 100) / 100,
    }));
}

function yieldsToDailyPoints(yields: Array<{ date: string; kwh: number }>): HistoryPoint[] {
  return yields.map(({ date, kwh }) => ({
    label: `${date.slice(6, 8)} ${MONTHS[parseInt(date.slice(4, 6)) - 1]}`,
    value: kwh,
  }));
}

function yieldsToMonthlyPoints(yields: Array<{ date: string; kwh: number }>): HistoryPoint[] {
  const map: Record<string, number> = {};
  for (const { date, kwh } of yields) {
    const month = date.slice(0, 6);
    map[month] = (map[month] ?? 0) + kwh;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, kwh]) => ({
      label: MONTHS[parseInt(m.slice(4, 6)) - 1],
      value: Math.round(kwh),
    }));
}

export function useSolarHistory(psId: string | undefined, period: HistoryPeriod) {
  return useQuery({
    queryKey: ["solar-history", psId, period],
    queryFn: async (): Promise<HistoryData> => {
      const now = new Date();

      if (period === "day") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const raw = await fetchHistory(psId!, toApiTs(start), toApiTs(now), 5);
        return { points: toDayPoints(raw), unit: "kW" };
      }

      let start: Date;
      if (period === "week") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      } else if (period === "month") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      } else {
        start = new Date(now.getFullYear(), 0, 1);
      }

      const yields = await fetchYields(psId!, start, now);
      if (period === "year") return { points: yieldsToMonthlyPoints(yields), unit: "kWh" };
      return { points: yieldsToDailyPoints(yields), unit: "kWh" };
    },
    enabled: !!psId,
    staleTime: period === "day" ? 5 * 60 * 1000 : 30 * 60 * 1000,
    notifyOnChangeProps: "all",
  });
}
