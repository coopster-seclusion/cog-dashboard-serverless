import { useProperties } from "@/context/PropertiesContext";
import { useSolarRealtime } from "@/hooks/useSolarRealtime";
import { clearSkyPeakGHI, clearSkyGHIAtHour } from "@/hooks/useWeather";

function formatTime(isoString: string, timezone: string): string {
  return new Date(isoString).toLocaleTimeString("en-NZ", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  });
}

// Parse decimal hour from Open-Meteo ISO string e.g. "2026-05-23T13:30" (local time, no offset)
function parseDecimalHour(isoStr: string): number {
  const t = isoStr.split("T")[1] ?? "0:0";
  const [h, m] = t.split(":").map(Number);
  return h + (m || 0) / 60;
}

export default function WeatherNow() {
  const { property, weatherData, weatherIsLoading } = useProperties();
  const { data: realtime } = useSolarRealtime(property?.solar_ps_id);

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

  // Derive cloud cover from actual irradiance vs clear-sky model.
  // iSolarCloud irradiance (83012) is ground truth — much more accurate than NWP model cloud_cover.
  const actualIrradiance = typeof realtime?.irradiance?.value === "number" ? realtime.irradiance.value : null;
  const sunriseHour  = today.sunrise[0] ? parseDecimalHour(today.sunrise[0]) : 6;
  const sunsetHour   = today.sunset[0]  ? parseDecimalHour(today.sunset[0])  : 20;
  const solarNoon    = (sunriseHour + sunsetHour) / 2;
  const currentHour  = parseDecimalHour(weatherData.current.time);
  const peakGHI      = clearSkyPeakGHI(new Date(weatherData.current.time));
  const clearSkyGHI  = clearSkyGHIAtHour(currentHour, solarNoon, peakGHI, sunriseHour, sunsetHour);

  const effectiveCloudCover = (actualIrradiance !== null && clearSkyGHI > 20)
    ? Math.max(0, Math.min(100, Math.round((1 - actualIrradiance / clearSkyGHI) * 100)))
    : cloud_cover;

  const cloudColor =
    effectiveCloudCover < 30 ? "#4CAF50" : effectiveCloudCover < 60 ? "#FF9800" : "#505050";

  return (
    <div className="relative px-4 py-4 flex flex-col gap-3">
      <div className="absolute top-4 right-4 text-[10px] font-mono" style={{ color: "#404040" }}>
        Updated {formatTime(weatherData.current.time, timezone)}
      </div>
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
            {effectiveCloudCover}%
          </span>
        </div>
        <div className="h-1.5 rounded overflow-hidden" style={{ background: "#1A1A1A" }}>
          <div
            className="h-full rounded transition-all"
            style={{ width: `${effectiveCloudCover}%`, background: cloudColor }}
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
