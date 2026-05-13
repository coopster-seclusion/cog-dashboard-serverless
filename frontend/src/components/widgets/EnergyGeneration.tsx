import { useEnergyQuantities } from "@/hooks/useWITS";
import { WidgetSkeleton } from "@/components/layout/WidgetCard";

function ErrorState() {
  return (
    <div className="flex items-center justify-center h-24 text-[10px] font-mono text-[#E31937]">
      No data
    </div>
  );
}

export default function EnergyGeneration() {
  const { data: niData, isLoading: l1 } = useEnergyQuantities({
    schedule: "PRSS",
    back: 1,
    island: "NI",
  });
  const { data: siData, isLoading: l2 } = useEnergyQuantities({
    schedule: "PRSS",
    back: 1,
    island: "SI",
  });

  if (l1 || l2) return <WidgetSkeleton height={96} />;

  const niLatest = niData?.records?.slice(-1)[0];
  const siLatest = siData?.records?.slice(-1)[0];
  const niMW = niLatest?.generation ?? null;
  const siMW = siLatest?.generation ?? null;
  const tp = niLatest?.trading_period ?? null;

  if (niMW == null || siMW == null) return <ErrorState />;

  const total = niMW + siMW;
  const niPct = total > 0 ? (niMW / total) * 100 : 50;
  const siPct = 100 - niPct;

  return (
    <div className="px-4 py-3 flex flex-col gap-2">
      {/* TP label */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#505050]">Total generation</span>
        {tp != null && (
          <span className="text-[10px] font-mono text-[#00BCD4]">
            PRS · NI+SI · TP{tp}
          </span>
        )}
      </div>

      {/* Total */}
      <span className="text-2xl font-bold font-mono text-white tabular-nums">
        {Math.round(total).toLocaleString()} MW
      </span>

      {/* Bi-color bar */}
      <div className="flex h-2 rounded overflow-hidden">
        <div style={{ width: `${niPct}%`, backgroundColor: "#FF8C00" }} />
        <div style={{ width: `${siPct}%`, backgroundColor: "#4CAF50" }} />
      </div>

      {/* Island labels */}
      <div className="flex justify-between">
        <span className="text-[10px] font-mono" style={{ color: "#FF8C00" }}>
          NI {Math.round(niMW).toLocaleString()} MW
        </span>
        <span className="text-[10px] font-mono" style={{ color: "#4CAF50" }}>
          SI {Math.round(siMW).toLocaleString()} MW
        </span>
      </div>
    </div>
  );
}
