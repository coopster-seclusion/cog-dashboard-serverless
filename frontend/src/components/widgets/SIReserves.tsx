import { useReserveQuantities } from "@/hooks/useWITS";
import { WidgetSkeleton } from "@/components/layout/WidgetCard";

function ErrorState() {
  return (
    <div className="flex items-center justify-center h-24 text-[10px] font-mono text-[#E31937]">
      No data
    </div>
  );
}

export default function SIReserves() {
  const { data, isLoading } = useReserveQuantities("", {
    schedule: "PRSS",
    back: 1,
    island: "SI",
  });

  if (isLoading) return <WidgetSkeleton height={96} />;
  if (!data?.records?.length) return <ErrorState />;

  const latest = data.records.slice(-1)[0];
  const tp = latest?.trading_period;
  const latestTP = latest?.trading_period;
  const latestRecords = data.records.filter((r) => r.trading_period === latestTP);

  const fastMW = latestRecords
    .filter((r) => r.reserve_class?.toLowerCase() === "fast")
    .reduce((sum, r) => sum + (r.reserve_mw ?? 0), 0);

  const sustainedMW = latestRecords
    .filter(
      (r) =>
        r.reserve_class?.toLowerCase() === "sustained" ||
        r.reserve_class?.toLowerCase() === "slow",
    )
    .reduce((sum, r) => sum + (r.reserve_mw ?? 0), 0);

  const hasData = latestRecords.length > 0;

  return (
    <div className="px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#505050]">SI Reserves</span>
        {tp != null && (
          <span className="text-[10px] font-mono text-[#00BCD4]">
            PRSS · SI · TP{tp}
          </span>
        )}
      </div>

      {hasData ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#A0A0A0]">Fast</span>
            <span className="text-[15px] font-mono font-semibold text-white tabular-nums">
              {Math.round(fastMW).toLocaleString()} MW
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#A0A0A0]">Sustained</span>
            <span className="text-[15px] font-mono font-semibold text-white tabular-nums">
              {Math.round(sustainedMW).toLocaleString()} MW
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#A0A0A0]">Fast</span>
            <span className="text-[15px] font-mono font-semibold text-[#505050]">—</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#A0A0A0]">Sustained</span>
            <span className="text-[15px] font-mono font-semibold text-[#505050]">—</span>
          </div>
        </div>
      )}
    </div>
  );
}
