import { useProperties } from "@/context/PropertiesContext";

function formatTime(isoString: string, timezone: string): string {
  return new Date(isoString).toLocaleTimeString("en-NZ", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}

export default function WeatherNow() {
  const { property, weatherData, weatherIsLoading } = useProperties();

  if (weatherIsLoading) {
    return (
      <div className="px-4 py-4 animate-pulse space-y-2">
        <div className="h-10 bg-[#1A1A1A] rounded w-2/3" />
        <div className="h-2 bg-[#1A1A1A] rounded w-full" />
        <div className="h-2 bg-[#1A1A1A] rounded w-3/4" />
      </div>
    );
  }

  if (!weatherData || !property) {
    return (
      <div className="px-4 py-4 text-[10px] font-mono" style={{ color: "#505050" }}>
        No data
      </div>
    );
  }

  const { temperature_2m, cloud_cover, shortwave_radiation } = weatherData.current;
  const today = weatherData.daily;
  const timezone = property.weather.timezone;

  const cloudColor =
    cloud_cover < 30 ? "#4CAF50" : cloud_cover < 60 ? "#FF9800" : "#505050";

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      {/* Temp */}
      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold font-mono text-white tabular-nums">
          {temperature_2m.toFixed(1)}
        </span>
        <span className="text-[15px] font-mono mb-0.5" style={{ color: "#A0A0A0" }}>
          °C
        </span>
      </div>

      {/* Cloud cover */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px]">
          <span style={{ color: "#A0A0A0" }}>Cloud Cover</span>
          <span className="font-mono" style={{ color: cloudColor }}>
            {cloud_cover}%
          </span>
        </div>
        <div className="h-1.5 rounded overflow-hidden" style={{ background: "#1A1A1A" }}>
          <div
            className="h-full rounded transition-all"
            style={{ width: `${cloud_cover}%`, background: cloudColor }}
          />
        </div>
      </div>

      {/* GHI */}
      <div className="flex justify-between text-[10px]">
        <span style={{ color: "#A0A0A0" }}>Solar Irradiance</span>
        <span className="font-mono text-white">
          {shortwave_radiation.toFixed(0)} W/m²
        </span>
      </div>

      {/* Sunrise / Sunset */}
      {today.sunrise[0] && today.sunset[0] && (
        <div className="flex justify-between text-[10px] font-mono pt-1 border-t" style={{ borderColor: "#2A2A2A", color: "#00BCD4" }}>
          <span>↑ {formatTime(today.sunrise[0], timezone)}</span>
          <span>↓ {formatTime(today.sunset[0], timezone)}</span>
        </div>
      )}
    </div>
  );
}
