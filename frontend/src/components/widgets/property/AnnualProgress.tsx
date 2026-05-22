import { useProperties } from "@/context/PropertiesContext";
import EstimatedBadge from "./EstimatedBadge";

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function AnnualProgress() {
  const { property, weatherIsLoading } = useProperties();

  if (weatherIsLoading) {
    return (
      <div className="px-4 py-4 animate-pulse space-y-2">
        <div className="h-8 bg-[#1A1A1A] rounded w-1/2" />
        <div className="h-2 bg-[#1A1A1A] rounded w-full" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="px-4 py-4 text-[10px] font-mono" style={{ color: "#505050" }}>
        No data
      </div>
    );
  }

  const target = property.system.annual_target_kwh;
  const today = new Date();
  const dayOfYear = getDayOfYear(today);
  const ytdProportion = dayOfYear / 365;
  const ytdEstimate = Math.round(ytdProportion * target);
  const proportionalTarget = ytdProportion * target;
  const pct = Math.min((ytdEstimate / target) * 100, 100);

  let status: { label: string; color: string };
  if (ytdEstimate > proportionalTarget * 1.1) {
    status = { label: "AHEAD", color: "#00BCD4" };
  } else if (ytdEstimate < proportionalTarget * 0.9) {
    status = { label: "BEHIND", color: "#FF9800" };
  } else {
    status = { label: "ON TRACK", color: "#4CAF50" };
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-2xl font-bold font-mono text-white tabular-nums">
            {(ytdEstimate / 1000).toFixed(1)}
          </span>
          <span className="text-[12px] font-mono ml-1" style={{ color: "#A0A0A0" }}>
            MWh YTD
          </span>
        </div>
        <EstimatedBadge />
      </div>

      <div className="flex justify-between text-[10px]">
        <span style={{ color: "#A0A0A0" }}>
          Target: {(target / 1000).toFixed(0)} MWh
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
        <span>{pct.toFixed(1)}% complete</span>
      </div>
    </div>
  );
}
