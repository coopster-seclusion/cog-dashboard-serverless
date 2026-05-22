import { useProperties } from "@/context/PropertiesContext";
import { NZ_EMISSION_FACTOR_KG_PER_KWH } from "@/hooks/useWeather";
import EstimatedBadge from "../shared/EstimatedBadge";

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function CarbonOffset() {
  const { property } = useProperties();

  if (!property) {
    return (
      <div className="px-4 py-4 text-[10px] font-mono" style={{ color: "#505050" }}>
        No data
      </div>
    );
  }

  const target = property.system.annual_target_kwh;
  const annualKg = target * NZ_EMISSION_FACTOR_KG_PER_KWH;
  const annualTonnes = annualKg / 1000;

  const dayOfYear = getDayOfYear(new Date());
  const ytdKwh = (dayOfYear / 365) * target;
  const ytdKg = ytdKwh * NZ_EMISSION_FACTOR_KG_PER_KWH;
  const ytdTonnes = ytdKg / 1000;

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-3xl font-bold font-mono text-white tabular-nums">
            {ytdTonnes.toFixed(1)}
          </span>
          <span className="text-[12px] font-mono ml-1" style={{ color: "#A0A0A0" }}>
            t CO₂e YTD
          </span>
        </div>
        <EstimatedBadge />
      </div>

      <div className="text-[10px]" style={{ color: "#A0A0A0" }}>
        {Math.round(ytdKg).toLocaleString()} kg avoided this year
      </div>

      <div className="h-px w-full" style={{ background: "#2A2A2A" }} />

      <div className="flex justify-between text-[10px]">
        <span style={{ color: "#505050" }}>Annual estimate</span>
        <span className="font-mono" style={{ color: "#4CAF50" }}>
          {annualTonnes.toFixed(1)} t CO₂e
        </span>
      </div>

      <div className="text-[9px]" style={{ color: "#303030" }}>
        Based on NZ grid avg {NZ_EMISSION_FACTOR_KG_PER_KWH} kgCO₂e/kWh
      </div>
    </div>
  );
}
