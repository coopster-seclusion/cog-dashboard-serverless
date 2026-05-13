import { usePrices } from "@/hooks/useWITS";
import { WidgetSkeleton } from "@/components/layout/WidgetCard";

interface NodeTickerProps {
  nodeId: string;
}

// Converts ISO timestamp to NZT trading period number and HH:MM
function tsToTPLabel(ts: string): string {
  const fmt = new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(ts));
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const tp = Math.floor((hour * 60 + minute) / 30) + 1;
  const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return `TP${tp} · ${time}`;
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-24 px-4 text-[10px] font-mono text-[#E31937]">
      {message}
    </div>
  );
}

export default function NodeTicker({ nodeId }: NodeTickerProps) {
  const { data, isLoading, error } = usePrices(
    { schedule: "RTD", nodes: nodeId, back: 3 },
    true,
  );

  if (isLoading) return <WidgetSkeleton height={108} />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data) return null;

  const nodeData = data.nodes[nodeId];
  if (!nodeData) return <ErrorState message={`No data for ${nodeId}`} />;

  // Build sorted pairs, newest first, take 3
  const pairs = nodeData.timestamps
    .map((ts, i) => ({ ts, price: nodeData.prices[i] }))
    .filter((p) => p.ts != null && p.price != null)
    .sort((a, b) => new Date(b.ts!).getTime() - new Date(a.ts!).getTime())
    .slice(0, 3);

  return (
    <div className="divide-y divide-[#1A1A1A]">
      {pairs.map(({ ts, price }, i) => {
        const prev = pairs[i + 1];
        const delta = prev?.price != null ? price! - prev.price! : null;
        const up = delta != null && delta > 0;
        const down = delta != null && delta < 0;

        return (
          <div
            key={ts}
            className="flex items-center justify-between px-4 py-2.5"
          >
            <span className="text-[10px] font-mono text-[#505050] w-24 shrink-0">
              {ts ? tsToTPLabel(ts) : "—"}
            </span>

            <span
              className="text-[13px] font-bold shrink-0"
              style={{ color: up ? "#E31937" : down ? "#4CAF50" : "#505050" }}
            >
              {up ? "↑" : down ? "↓" : "→"}
            </span>

            <span className="text-[13px] font-mono font-semibold text-white tabular-nums text-right">
              {price != null ? `$${price.toFixed(2)}` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
