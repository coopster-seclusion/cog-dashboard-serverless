import { useProperties } from "@/context/PropertiesContext";
import { estimateKW } from "@/hooks/useWeather";
import EstimatedBadge from "../shared/EstimatedBadge";

export default function EstimatedOutput() {
  const { property, weatherData, weatherIsLoading } = useProperties();

  if (weatherIsLoading) {
    return (
      <div className="px-4 py-4 animate-pulse">
        <div className="h-10 bg-[#1A1A1A] rounded mb-2 w-3/4" />
        <div className="h-2 bg-[#1A1A1A] rounded w-full" />
      </div>
    );
  }

  if (!property || !weatherData) {
    return (
      <div className="px-4 py-4 text-[10px] font-mono" style={{ color: "#505050" }}>
        No data
      </div>
    );
  }

  const ghi = weatherData.current.shortwave_radiation;
  const currentKW = estimateKW(ghi, property.system.capacity_kw, property.system.performance_ratio);
  const peakKW = property.system.peak_output_kw;
  const pct = Math.min((currentKW / peakKW) * 100, 100);
  const isNight = ghi === 0;

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-3xl font-bold font-mono text-white tabular-nums">
            {currentKW.toFixed(1)}
          </span>
          <span className="text-[13px] font-mono ml-1" style={{ color: "#A0A0A0" }}>
            kW
          </span>
        </div>
        <EstimatedBadge />
      </div>

      {isNight ? (
        <p className="text-[10px]" style={{ color: "#505050" }}>
          Outside generation hours
        </p>
      ) : (
        <p className="text-[10px]" style={{ color: "#A0A0A0" }}>
          of {peakKW} kW peak capacity
        </p>
      )}

      <div className="h-1.5 rounded overflow-hidden" style={{ background: "#1A1A1A" }}>
        <div
          className="h-full rounded transition-all duration-700"
          style={{ width: `${pct}%`, background: "#E31937" }}
        />
      </div>

      <div className="flex justify-between text-[9px] font-mono" style={{ color: "#505050" }}>
        <span>0 kW</span>
        <span>{peakKW} kW</span>
      </div>
    </div>
  );
}
