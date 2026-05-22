import { useProperties } from "@/context/PropertiesContext";
import { useSolarRealtime } from "@/hooks/useSolarRealtime";

export default function EstimatedOutput() {
  const { property } = useProperties();
  const { data: realtime, isLoading } = useSolarRealtime(property?.solar_ps_id);

  if (isLoading) {
    return (
      <div className="px-4 py-4 animate-pulse">
        <div className="h-10 bg-[#1A1A1A] rounded mb-2 w-3/4" />
        <div className="h-3 bg-[#1A1A1A] rounded w-full" />
      </div>
    );
  }

  const currentKW = typeof realtime?.power?.value === "number"
    ? realtime.power.value / 1000
    : null;
  const capacityKW = property?.system.capacity_kw ?? 0;
  const pct = currentKW !== null && capacityKW > 0
    ? Math.min((currentKW / capacityKW) * 100, 100)
    : 0;
  const isNight = currentKW === 0;

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-3xl font-bold font-mono text-white tabular-nums">
            {currentKW !== null ? currentKW.toFixed(1) : "—"}
          </span>
          <span className="text-[13px] font-mono ml-1" style={{ color: "#A0A0A0" }}>
            kW
          </span>
        </div>

        {/* Live badge */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2 shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ background: "#4CAF50" }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ background: "#4CAF50" }}
            />
          </span>
          <span className="text-[11px] tracking-widest uppercase" style={{ color: "#4CAF50" }}>
            Live
          </span>
        </div>
      </div>

      {currentKW === null ? (
        <p className="text-[10px]" style={{ color: "#505050" }}>
          Awaiting data
        </p>
      ) : isNight ? (
        <p className="text-[10px]" style={{ color: "#505050" }}>
          Outside generation hours
        </p>
      ) : (
        <p className="text-[10px]" style={{ color: "#A0A0A0" }}>
          of {capacityKW} kW installed capacity
        </p>
      )}

      <div className="h-3 rounded overflow-hidden" style={{ background: "#1A1A1A" }}>
        <div
          className="h-full rounded transition-all duration-700"
          style={{ width: `${pct}%`, background: "#4CAF50" }}
        />
      </div>

      <div className="flex justify-between text-[9px] font-mono" style={{ color: "#505050" }}>
        <span>0 kW</span>
        <span>{capacityKW} kW</span>
      </div>
    </div>
  );
}
