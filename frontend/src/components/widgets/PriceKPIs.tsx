import { usePrices } from "@/hooks/useWITS";
import { CHART_COLORS } from "@/lib/nivoTheme";
import { WidgetSkeleton } from "@/components/layout/WidgetCard";

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-24 px-4 text-[11px] font-mono text-[#E31937]">
      {message}
    </div>
  );
}

export default function PriceKPIs() {
  // Same query key as PriceChart — TanStack Query returns cached data, no extra fetch
  const { data, isLoading, error } = usePrices();

  if (isLoading) return <WidgetSkeleton height={160} />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data) return null;

  const kpis = Object.entries(data.nodes).map(([nodeId, nodeData], i) => {
    const pairs = nodeData.timestamps
      .map((ts, j) => ({ ts, price: nodeData.prices[j] }))
      .filter((p) => p.price != null)
      .sort((a, b) => {
        if (!a.ts || !b.ts) return 0;
        return new Date(a.ts).getTime() - new Date(b.ts).getTime();
      });

    const latest = pairs[pairs.length - 1];
    const prev = pairs[pairs.length - 2];
    const delta =
      latest?.price != null && prev?.price != null
        ? latest.price - prev.price
        : null;

    return {
      nodeId,
      color: CHART_COLORS[i] ?? "#505050",
      price: latest?.price ?? null,
      delta,
    };
  });

  return (
    <div className="divide-y divide-[#2A2A2A]">
      {kpis.map(({ nodeId, color, price, delta }) => (
        <div key={nodeId} className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-[11px] font-mono text-[#A0A0A0]">{nodeId}</span>
          </div>

          <div className="text-right">
            <div className="text-lg font-mono font-semibold text-white tabular-nums">
              {price != null ? `$${price.toFixed(2)}` : "—"}
            </div>
            {delta != null && (
              <div
                className="text-[10px] font-mono tabular-nums"
                style={{ color: delta >= 0 ? "#34D399" : "#E31937" }}
              >
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(2)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
