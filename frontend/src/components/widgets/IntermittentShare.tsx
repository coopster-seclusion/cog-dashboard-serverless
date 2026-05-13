import { ResponsiveLine } from "@nivo/line";
import { useEnergyQuantities } from "@/hooks/useWITS";
import { nivoTheme, CHART_COLORS } from "@/lib/nivoTheme";
import { WidgetSkeleton } from "@/components/layout/WidgetCard";
import type { EnergyRecord } from "@/lib/api";

type NivoPoint = { x: string; y: number | null };
type NivoSeries = { id: string; color: string; data: NivoPoint[] };

const ISLAND_COLORS: Record<string, string> = {
  NI:  CHART_COLORS[0],
  SI:  CHART_COLORS[1],
  All: CHART_COLORS[0],
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

function buildSeries(records: EnergyRecord[]): NivoSeries[] {
  const byIsland = new Map<string, EnergyRecord[]>();

  for (const r of records) {
    const key = r.island ?? "All";
    if (!byIsland.has(key)) byIsland.set(key, []);
    byIsland.get(key)!.push(r);
  }

  return Array.from(byIsland.entries()).map(([island, recs], i) => {
    const sorted = recs
      .filter((r) => r.timestamp)
      .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());

    const data: NivoPoint[] = sorted.map((r) => {
      const pct =
        r.generation != null && r.generation > 0 && r.intermittent_generation != null
          ? (r.intermittent_generation / r.generation) * 100
          : null;
      return {
        x: r.timestamp!,
        y: pct != null ? Math.round(pct * 10) / 10 : null,
      };
    });

    return {
      id: island,
      color: ISLAND_COLORS[island] ?? CHART_COLORS[i] ?? "#505050",
      data,
    };
  });
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[240px] px-4 text-[11px] font-mono text-[#E31937]">
      {message}
    </div>
  );
}

export default function IntermittentShare() {
  const { data, isLoading, error } = useEnergyQuantities();

  if (isLoading) return <WidgetSkeleton height={282} />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data?.records.length) return <ErrorState message="No quantity data available." />;

  const series = buildSeries(data.records);
  if (!series.length) return <ErrorState message="No quantity data available." />;

  const kpis = series.map((s) => ({
    id: s.id,
    color: s.color,
    pct: s.data[s.data.length - 1]?.y ?? null,
  }));

  const totalPoints = series[0].data.length;
  const tickEvery = Math.max(1, Math.floor(totalPoints / 6));
  const tickValues = series[0].data
    .filter((_, i) => i % tickEvery === 0)
    .map((p) => p.x);

  return (
    <div>
      <div className="flex gap-4 px-4 pt-3 pb-1">
        {kpis.map(({ id, color, pct }) => (
          <div key={id} className="flex items-baseline gap-1.5">
            <span
              className="text-2xl font-mono font-semibold tabular-nums"
              style={{ color }}
            >
              {pct != null ? `${pct.toFixed(1)}%` : "—"}
            </span>
            <span className="text-[11px] font-mono text-[#505050]">{id}</span>
          </div>
        ))}
      </div>

      <div className="h-[200px]">
        <ResponsiveLine
          data={series}
          theme={nivoTheme}
          colors={series.map((s) => s.color)}
          margin={{ top: 8, right: 16, bottom: 28, left: 52 }}
          xScale={{ type: "point" }}
          xFormat={(v) => formatTime(v as string)}
          yScale={{ type: "linear", min: 0, max: "auto", stacked: false }}
          yFormat={(v) => `${Number(v).toFixed(1)}%`}
          axisBottom={{
            tickValues,
            tickSize: 0,
            tickPadding: 8,
            format: (v) => formatTime(v as string),
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            format: (v) => `${v}%`,
          }}
          enableGridX
          enableGridY
          gridYValues={5}
          lineWidth={1.5}
          enablePoints={false}
          enableSlices="x"
          crosshairType="x"
          animate={false}
        />
      </div>

      {series.length > 1 && (
        <div className="flex gap-5 px-4 pb-3 pt-1">
          {series.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-[11px] font-mono text-[#A0A0A0]">{s.id}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
