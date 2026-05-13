import { ResponsiveLine } from "@nivo/line";
import { usePrices } from "@/hooks/useWITS";
import { nivoTheme, CHART_COLORS } from "@/lib/nivoTheme";
import { WidgetSkeleton } from "@/components/layout/WidgetCard";
import type { PricesResponse } from "@/lib/api";

type NivoPoint = { x: string; y: number | null };
type NivoSeries = { id: string; color: string; data: NivoPoint[] };

function buildNodeSeries(
  data: PricesResponse,
  scheduleLabel: string,
  colorFn: (base: string) => string,
): NivoSeries[] {
  return Object.entries(data.nodes).map(([nodeId, nodeData], i) => {
    const pairs = nodeData.timestamps
      .map((ts, j) => ({ ts, price: nodeData.prices[j] }))
      .sort((a, b) => {
        if (!a.ts || !b.ts) return 0;
        return new Date(a.ts).getTime() - new Date(b.ts).getTime();
      });
    return {
      id: `${nodeId} ${scheduleLabel}`,
      color: colorFn(CHART_COLORS[i] ?? "#505050"),
      data: pairs.map(({ ts, price }, j) => ({ x: ts ?? String(j), y: price })),
    };
  });
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
  seriesId: string;
  seriesColor: string;
  data: { xFormatted: string; y: number | null };
};

function OverlayTooltip({ slice }: { slice: { points: readonly TooltipPoint[] } }) {
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
        minWidth: 160,
      }}
    >
      <div style={{ color: "#505050", marginBottom: 4 }}>{label}</div>
      {slice.points.map((point) => (
        <div key={String(point.seriesId)} style={{ color: point.seriesColor }}>
          {String(point.seriesId)}:{" "}
          {point.data.y != null
            ? `$${(point.data.y as number).toFixed(2)}/MWh`
            : "—"}
        </div>
      ))}
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

export default function ScheduleOverlay() {
  // Always pin RTD and PRSL regardless of the global schedule selector.
  // PRSL gets forward=6 (3 hours ahead). from/to are cleared so a CUSTOM
  // time range in context doesn't create an invalid back+from conflict.
  const { data: rtdData, isLoading: l1, error: e1 } = usePrices({ schedule: "RTD" });
  const { data: prslData, isLoading: l2 } = usePrices({
    schedule: "PRSL",
    forward: 6,
    from: undefined,
    to: undefined,
  });

  if (l1 || l2) return <WidgetSkeleton height={282} />;
  if (e1) return <ErrorState message={(e1 as Error).message} />;
  if (!rtdData) return null;

  const rtdSeries = buildNodeSeries(rtdData, "RTD", (c) => c);
  // PRSL: same hue at ~60% opacity via 8-digit hex alpha ("99" ≈ 60%)
  const prslSeries = prslData
    ? buildNodeSeries(prslData, "PRSL", (c) => c + "99")
    : [];

  const series: NivoSeries[] = [...rtdSeries, ...prslSeries];

  // "Now" separator: the latest RTD timestamp — everything to its right is forecast
  const nowTs = rtdSeries[0]?.data.at(-1)?.x as string | undefined;

  // Ticks span the full x range including PRSL future periods
  const allTimestamps = Array.from(
    new Set(series.flatMap((s) => s.data.map((p) => p.x as string)))
  ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const tickEvery = Math.max(1, Math.floor(allTimestamps.length / 6));
  const tickValues = allTimestamps.filter((_, i) => i % tickEvery === 0);

  return (
    <div>
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
          sliceTooltip={OverlayTooltip as any}
          crosshairType="x"
          animate={false}
          markers={
            nowTs
              ? [
                  {
                    axis: "x",
                    value: nowTs,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    lineStyle: {
                      stroke: "#E31937",
                      strokeWidth: 1,
                      strokeOpacity: 0.5,
                      strokeDasharray: "3 4",
                    } as any,
                    legend: "NOW",
                    legendPosition: "top-right",
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    legendStyle: {
                      fill: "#505050",
                      fontSize: 9,
                      fontFamily: "Roboto Mono, monospace",
                    } as any,
                  },
                ]
              : []
          }
        />
      </div>

      {/* Legend: nodes + schedule style key */}
      <div className="flex items-center justify-between px-4 pb-3 pt-1">
        <div className="flex gap-4">
          {rtdSeries.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: CHART_COLORS[i] ?? "#505050" }}
              />
              <span className="text-[11px] font-mono text-[#A0A0A0]">
                {s.id.replace(" RTD", "")}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-[#505050]">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-[2px] bg-[#A0A0A0] rounded" />
            <span>RTD</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-[1.5px] rounded" style={{ backgroundColor: "#A0A0A0", opacity: 0.4 }} />
            <span>PRSL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
