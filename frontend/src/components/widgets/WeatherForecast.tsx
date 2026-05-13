import { useProperties } from "@/context/PropertiesContext";
import { solarPotentialLabel, wmoEmoji } from "@/hooks/useWeather";

function formatDayLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-NZ", { weekday: "short" });
}

export default function WeatherForecast() {
  const { weatherData, weatherIsLoading } = useProperties();

  if (weatherIsLoading) {
    return (
      <div className="px-4 py-4 animate-pulse flex gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 h-28 bg-[#1A1A1A] rounded" />
        ))}
      </div>
    );
  }

  if (!weatherData) {
    return (
      <div className="flex items-center justify-center h-28 text-[10px] font-mono" style={{ color: "#505050" }}>
        No data
      </div>
    );
  }

  const daily = weatherData.daily;
  const maxGHI = Math.max(...daily.shortwave_radiation_sum);

  return (
    <div className="px-4 py-3 flex gap-2 overflow-x-auto">
      {daily.time.map((date, i) => {
        const ghiSum = daily.shortwave_radiation_sum[i] ?? 0;
        const potential = solarPotentialLabel(ghiSum);
        const maxTemp = daily.temperature_2m_max[i]?.toFixed(0) ?? "—";
        const code = daily.weather_code[i] ?? 0;
        const barPct = maxGHI > 0 ? (ghiSum / maxGHI) * 100 : 0;

        return (
          <div
            key={date}
            className="flex flex-col items-center gap-1.5 min-w-[60px] flex-1 py-2 px-1 rounded"
            style={{ background: "#1A1A1A" }}
          >
            <span className="text-[10px] font-medium" style={{ color: "#A0A0A0" }}>
              {formatDayLabel(date)}
            </span>
            <span className="text-[18px] leading-none">{wmoEmoji(code)}</span>
            <span className="text-[11px] font-mono text-white">{maxTemp}°</span>
            <span
              className="text-[9px] font-semibold tracking-wide"
              style={{ color: potential.color }}
            >
              {potential.label}
            </span>
            {/* GHI bar */}
            <div
              className="w-full h-1 rounded overflow-hidden"
              style={{ background: "#2A2A2A" }}
            >
              <div
                className="h-full rounded"
                style={{ width: `${barPct}%`, background: potential.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
