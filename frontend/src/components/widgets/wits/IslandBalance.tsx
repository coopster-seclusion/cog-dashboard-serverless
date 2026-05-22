import { ResponsiveBar } from "@nivo/bar";
import { useEnergyQuantities } from "@/hooks/useWITS";
import { nivoTheme, CHART_COLORS } from "@/lib/nivoTheme";
import { WidgetSkeleton } from "@/components/layout/WidgetCard";
import type { EnergyRecord } from "@/lib/api";

type BarDatum = Record<string, string | number>;

const COLOR_MAP: Record<string, string> = {
  "NI gen":  CHART_COLORS[0],
  "NI load": CHART_COLORS[2],
  "SI gen":  CHART_COLORS[1],
  "SI load": CHART_COLORS[3],
  gen:  CHART_COLORS[0],
  load: CHART_COLORS[2],
};

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString("en-NZ", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return ts;
  }
}

function buildBarData(records: EnergyRecord[]): { data: BarDatum[]; keys: string[] } {
  const groups = new Map<string, Map<string, number>>();
  const keySet = new Set<string>();

  for (const r of records) {
    if (!r.timestamp) continue;
    if (!groups.has(r.timestamp)) groups.set(r.timestamp, new Map());
    const group = groups.get(r.timestamp)!;
    const prefix = r.island ? `${r.island} ` : "";
    const genKey  = `${prefix}gen`;
    const loadKey = `${prefix}load`;
    group.set(genKey,  r.generation ?? 0);
    group.set(loadKey, r.load ?? 0);
    keySet.add(genKey);
    keySet.add(loadKey);
  }

  const sortedEntries = Array.from(groups.entries()).sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime(),
  );

  // Thin to ≤ 24 bar groups for readability
  const step = Math.max(1, Math.floor(sortedEntries.length / 24));
  const keys = Array.from(keySet).sort();

  const data: BarDatum[] = sortedEntries
    .filter((_, i) => i % step === 0)
    .map(([ts, group]) => {
      const datum: BarDatum = { time: formatTime(ts) };
      for (const key of keys) datum[key] = group.get(key) ?? 0;
      return datum;
    });

  return { data, keys };
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[240px] px-4 text-[11px] font-mono text-[#E31937]">
      {message}
    </div>
  );
}

export default function IslandBalance() {
  const { data, isLoading, error } = useEnergyQuantities();

  if (isLoading) return <WidgetSkeleton height={282} />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data?.records.length) return <ErrorState message="No quantity data available." />;

  const { data: barData, keys } = buildBarData(data.records);
  if (!barData.length) return <ErrorState message="No quantity data available." />;

  return (
    <div>
      <div className="h-[240px]">
        <ResponsiveBar
          data={barData}
          keys={keys}
          indexBy="time"
          theme={nivoTheme}
          colors={({ id }) => COLOR_MAP[String(id)] ?? "#505050"}
          margin={{ top: 8, right: 16, bottom: 40, left: 64 }}
          groupMode="grouped"
          padding={0.25}
          innerPadding={2}
          borderRadius={1}
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
            tickRotation: -45,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            format: (v) => `${v}`,
          }}
          enableGridX={false}
          enableGridY
          gridYValues={5}
          enableLabel={false}
          tooltip={({ id, value, color }) => (
            <div
              style={{
                background: "#1A1A1A",
                border: "1px solid #2A2A2A",
                borderRadius: 4,
                padding: "6px 10px",
                fontSize: 11,
                fontFamily: "Roboto Mono, monospace",
              }}
            >
              <span style={{ color }}>{String(id)}</span>
              {": "}
              <span style={{ color: "#FFFFFF" }}>
                {Math.round(Number(value)).toLocaleString()} MW
              </span>
            </div>
          )}
          animate={false}
        />
      </div>

      <div className="flex flex-wrap gap-4 px-4 pb-3 pt-1">
        {keys.map((key) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: COLOR_MAP[key] ?? "#505050" }}
            />
            <span className="text-[11px] font-mono text-[#A0A0A0]">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
