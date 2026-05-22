import { ResponsiveLine } from "@nivo/line";
import { usePriceSpread } from "@/hooks/useWITS";
import { nivoTheme } from "@/lib/nivoTheme";
import { WidgetSkeleton } from "@/components/layout/WidgetCard";

const SPREAD_COLOR = "#60A5FA"; // blue-400

type NivoPoint = { x: string; y: number | null };

function buildSpreadSeries(
  timestamps: (string | null)[],
  spread: (number | null)[],
) {
  const pairs = timestamps
    .map((ts, i) => ({ ts, value: spread[i] }))
    .sort((a, b) => {
      if (!a.ts || !b.ts) return 0;
      return new Date(a.ts).getTime() - new Date(b.ts).getTime();
    });

  const data: NivoPoint[] = pairs.map(({ ts, value }, j) => ({
    x: ts ?? String(j),
    y: value,
  }));

  return [{ id: "Spread", color: SPREAD_COLOR, data }];
}

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

type TooltipPoint = {
  seriesColor: string;
  data: { xFormatted: string; y: number | null };
};

function SpreadTooltip({ slice }: { slice: { points: readonly TooltipPoint[] } }) {
  const point = slice.points[0];
  if (!point) return null;
  const v = point.data.y;
  return (
    <div
      style={{
        background: "#1A1A1A",
        border: "1px solid #2A2A2A",
        borderRadius: 4,
        padding: "8px 12px",
        fontSize: 11,
        fontFamily: "Roboto Mono, monospace",
        minWidth: 120,
      }}
    >
      <div style={{ color: "#505050", marginBottom: 4 }}>{point.data.xFormatted}</div>
      <div style={{ color: v != null && v >= 0 ? "#34D399" : "#E31937" }}>
        {v != null
          ? `${v >= 0 ? "+" : ""}$${v.toFixed(2)}/MWh`
          : "—"}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[240px] px-4 text-[11px] font-mono text-[#E31937]">
      {message}
    </div>
  );
}

export default function PriceSpread() {
  const { data, isLoading, error } = usePriceSpread("HAY2201", "BEN2201");

  if (isLoading) return <WidgetSkeleton height={282} />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data) return null;

  const series = buildSpreadSeries(data.timestamps, data.spread);
  const points = series[0].data;

  if (points.length === 0) return <ErrorState message="No spread data available." />;

  // Current spread = last sorted value
  const currentSpread = points[points.length - 1]?.y ?? null;
  const spreadColor =
    currentSpread == null ? "#A0A0A0" : currentSpread >= 0 ? "#34D399" : "#E31937";

  const tickEvery = Math.max(1, Math.floor(points.length / 6));
  const tickValues = points
    .filter((_, i) => i % tickEvery === 0)
    .map((p) => p.x as string);

  return (
    <div>
      {/* Current spread KPI */}
      <div className="flex items-baseline gap-2 px-4 pt-3 pb-1">
        <span
          className="text-2xl font-mono font-semibold tabular-nums"
          style={{ color: spreadColor }}
        >
          {currentSpread != null
            ? `${currentSpread >= 0 ? "+" : ""}$${currentSpread.toFixed(2)}`
            : "—"}
        </span>
        <span className="text-[11px] font-mono text-[#505050]">HAY − BEN</span>
      </div>

      <div className="h-[200px]">
        <ResponsiveLine
          data={series}
          theme={nivoTheme}
          colors={[SPREAD_COLOR]}
          margin={{ top: 8, right: 16, bottom: 28, left: 58 }}
          xScale={{ type: "point" }}
          xFormat={(v) => formatTime(v as string)}
          yScale={{ type: "linear", min: "auto", max: "auto", stacked: false }}
          yFormat={(v) => `${Number(v) >= 0 ? "+" : ""}$${Number(v).toFixed(2)}`}
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
          gridYValues={4}
          lineWidth={1.5}
          enablePoints={false}
          enableArea
          areaOpacity={1}
          areaBaselineValue={0}
          defs={[
            {
              id: "spread-gradient",
              type: "linearGradient",
              x1: "0%",
              y1: "0%",
              x2: "0%",
              y2: "100%",
              colors: [
                { offset: 0, color: SPREAD_COLOR, opacity: 0.2 },
                { offset: 100, color: SPREAD_COLOR, opacity: 0.01 },
              ],
            },
          ]}
          fill={[{ match: "*", id: "spread-gradient" }]}
          markers={[
            {
              axis: "y",
              value: 0,
              lineStyle: {
                stroke: "#3A3A3A",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              },
            },
          ]}
          enableSlices="x"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sliceTooltip={SpreadTooltip as any}
          crosshairType="x"
          animate={false}
        />
      </div>
    </div>
  );
}
