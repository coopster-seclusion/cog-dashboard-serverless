import { useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import { usePrices } from "@/hooks/useWITS";
import { nivoTheme, CHART_COLORS } from "@/lib/nivoTheme";
import { WidgetSkeleton } from "@/components/layout/WidgetCard";
import { cn } from "@/lib/utils";
import type { PricesResponse } from "@/lib/api";

// ---------------------------------------------------------------------------
// Local time range
// ---------------------------------------------------------------------------

type LocalRange = "LIVE" | "1H" | "6H" | "24H";

const LOCAL_RANGES: LocalRange[] = ["LIVE", "1H", "6H", "24H"];

const BACK_MAP: Record<LocalRange, number> = {
  LIVE: 2,
  "1H": 2,
  "6H": 12,
  "24H": 48,
};

// ---------------------------------------------------------------------------
// Data transform
// ---------------------------------------------------------------------------

type NivoPoint = { x: string; y: number | null };
type NivoSeries = { id: string; color: string; data: NivoPoint[] };

function formatTime(ts: string | null): string {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleTimeString("en-NZ", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

function buildSeries(data: PricesResponse): NivoSeries[] {
  return Object.entries(data.nodes).map(([nodeId, nodeData], i) => {
    const pairs = nodeData.timestamps
      .map((ts, j) => ({ ts, price: nodeData.prices[j] }))
      .sort((a, b) => {
        if (!a.ts || !b.ts) return 0;
        return new Date(a.ts).getTime() - new Date(b.ts).getTime();
      });
    return {
      id: nodeId,
      color: CHART_COLORS[i] ?? "#505050",
      data: pairs.map(({ ts, price }, j) => ({ x: ts ?? String(j), y: price })),
    };
  });
}

// ---------------------------------------------------------------------------
// Slice tooltip — shows all nodes at the hovered x position
// ---------------------------------------------------------------------------

type TooltipPoint = {
  seriesId: string;
  seriesColor: string;
  data: { xFormatted: string; y: number | null; yFormatted: string };
};

function PriceTooltip({ slice }: { slice: { points: readonly TooltipPoint[] } }) {
  const label = slice.points[0]?.data.xFormatted ?? "";
  return (
    <div
      style={{
        background: "#1A1A1A",
        border: "1px solid #2A2A2A",
        borderRadius: 4,
        padding: "8px 12px",
        fontSize: 11,
        fontFamily: "Roboto Mono, monospace",
        minWidth: 140,
      }}
    >
      <div style={{ color: "#505050", marginBottom: 4 }}>{label}</div>
      {slice.points.map((point) => (
        <div key={point.seriesId} style={{ color: point.seriesColor }}>
          {String(point.seriesId)}:{" "}
          {point.data.y != null
            ? `$${(point.data.y as number).toFixed(2)}/MWh`
            : "—"}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[240px] px-4 text-[11px] font-mono text-[#E31937]">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PriceChart() {
  const [range, setRange] = useState<LocalRange>("LIVE");
  const { data, isLoading, error } = usePrices({ back: BACK_MAP[range] });

  if (isLoading) return <WidgetSkeleton height={306} />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data) return null;

  const series = buildSeries(data);
  if (!series.length || series[0].data.length === 0) {
    return <ErrorState message="No price data available." />;
  }

  const totalPoints = series[0].data.length;
  const tickEvery = Math.max(1, Math.floor(totalPoints / 6));
  const tickValues = series[0].data
    .filter((_, i) => i % tickEvery === 0)
    .map((p) => p.x as string);

  return (
    <div>
      {/* Time range strip */}
      <div className="flex items-center gap-0.5 px-4 pt-3 pb-1">
        {LOCAL_RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              "px-2.5 py-0.5 text-[10px] font-medium tracking-wider rounded transition-colors",
              range === r
                ? "bg-[#E31937] text-white"
                : "text-[#505050] hover:text-[#A0A0A0]",
            )}
          >
            {r}
          </button>
        ))}
        {range === "LIVE" && (
          <span className="relative flex h-2 w-2 ml-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]" />
          </span>
        )}
      </div>

      <div className="h-[240px]">
        <ResponsiveLine
          data={series}
          theme={nivoTheme}
          colors={series.map((s) => s.color)}
          margin={{ top: 8, right: 16, bottom: 28, left: 58 }}
          xScale={{ type: "point" }}
          xFormat={(v) => formatTime(v as string)}
          yScale={{ type: "linear", min: "auto", max: "auto", stacked: false }}
          yFormat={(v) => `$${Number(v).toFixed(2)}`}
          axisBottom={{
            tickValues,
            tickSize: 0,
            tickPadding: 8,
            format: (v) => formatTime(v as string),
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            format: (v) => `$${v}`,
          }}
          enableGridX
          enableGridY
          gridYValues={5}
          lineWidth={1.5}
          enablePoints={false}
          enableSlices="x"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sliceTooltip={PriceTooltip as any}
          crosshairType="x"
          animate={false}
        />
      </div>

      {/* Legend */}
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
    </div>
  );
}
