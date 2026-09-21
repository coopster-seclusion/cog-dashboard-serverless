import { useProperties } from "@/context/PropertiesContext";
import { useSolarYTD } from "@/hooks/useSolarYTD";
import EstimatedBadge from "../shared/EstimatedBadge";

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export default function AnnualProgress() {
  const { property } = useProperties();
  const { data: ytd, isLoading } = useSolarYTD(property?.solar_ps_id);

  if (isLoading || !property) {
    return (
      <div className="px-4 py-4 animate-pulse space-y-2">
        <div className="h-8 bg-[#1A1A1A] rounded w-1/2" />
        <div className="h-2 bg-[#1A1A1A] rounded w-full" />
      </div>
    );
  }

  const target       = property.system.annual_target_kwh;
  if (!target) {
    return (
      <div className="px-4 py-4 flex flex-col gap-2">
        {ytd ? (
          <span className="text-2xl font-bold font-mono text-white tabular-nums">
            {(ytd.ytd_kwh / 1000).toFixed(1)} <span className="text-[12px] text-[#A0A0A0]">MWh YTD</span>
          </span>
        ) : (
          <span className="text-[11px] text-[#A0A0A0]">YTD generation unavailable</span>
        )}
        <span className="text-[10px] text-[#505050]">Annual target to be confirmed</span>
      </div>
    );
  }
  if (!ytd && property.system.annual_target_estimated) {
    return <div className="px-4 py-4 text-[10px] font-mono text-[#505050]">YTD generation unavailable; estimated annual target: {(target / 1000).toFixed(0)} MWh</div>;
  }
  const today        = new Date();
  const dayOfYear    = getDayOfYear(today);
  const proportional = (dayOfYear / 365) * target;
  const isPartialFirstYear = property.system.connection_date?.startsWith(`${today.getFullYear()}-`) ?? false;
  const isReal       = !!ytd;

  const ytdKwh = isReal ? ytd!.ytd_kwh : Math.round((dayOfYear / 365) * target);
  const pct    = Math.min((ytdKwh / target) * 100, 100);

  let status: { label: string; color: string };
  if (isPartialFirstYear) {
    status = { label: "PARTIAL YEAR", color: "#A0A0A0" };
  } else if (ytdKwh > proportional * 1.05) {
    status = { label: "AHEAD", color: "#00BCD4" };
  } else if (ytdKwh < proportional * 0.95) {
    status = { label: "BEHIND", color: "#FF9800" };
  } else {
    status = { label: "ON TRACK", color: "#4CAF50" };
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-2xl font-bold font-mono text-white tabular-nums">
            {(ytdKwh / 1000).toFixed(1)}
          </span>
          <span className="text-[12px] font-mono ml-1" style={{ color: "#A0A0A0" }}>
            MWh YTD
          </span>
        </div>
        {!isReal && <EstimatedBadge />}
      </div>

      <div className="flex justify-between text-[10px]">
        <span style={{ color: "#A0A0A0" }}>
          {property.system.annual_target_estimated ? "Est. target" : "Target"}: {(target / 1000).toFixed(0)} MWh
        </span>
        <span className="font-semibold font-mono" style={{ color: status.color }}>
          {status.label}
        </span>
      </div>

      <div className="h-1.5 rounded overflow-hidden" style={{ background: "#1A1A1A" }}>
        <div
          className="h-full rounded transition-all duration-700"
          style={{ width: `${pct}%`, background: "#E31937" }}
        />
      </div>

      <div className="flex justify-between text-[9px] font-mono" style={{ color: "#505050" }}>
        <span>Day {dayOfYear} of 365</span>
        <span>{pct.toFixed(1)}%</span>
      </div>
      {property.system.annual_target_basis && (
        <div className="text-[9px] text-[#505050]">Based on {property.system.annual_target_basis}</div>
      )}
    </div>
  );
}
