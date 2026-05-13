import { useQuery } from "@tanstack/react-query";
import type { PropertyWeather } from "@/types/property";

// ---------------------------------------------------------------------------
// Open-Meteo API types
// ---------------------------------------------------------------------------

export interface OpenMeteoCurrentWeather {
  time: string;
  temperature_2m: number;
  cloud_cover: number;
  shortwave_radiation: number;
  direct_radiation: number;
  weather_code: number;
  wind_speed_10m: number;
}

export interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  cloud_cover: number[];
  shortwave_radiation: number[];
  direct_radiation: number[];
  diffuse_radiation: number[];
  sunshine_duration: number[];
}

export interface OpenMeteoDaily {
  time: string[];
  sunrise: string[];
  sunset: string[];
  shortwave_radiation_sum: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  weather_code: number[];
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: OpenMeteoCurrentWeather;
  hourly: OpenMeteoHourly;
  daily: OpenMeteoDaily;
}

// ---------------------------------------------------------------------------
// Fetch function
// ---------------------------------------------------------------------------

async function fetchWeatherData(weather: PropertyWeather): Promise<OpenMeteoResponse> {
  const params = new URLSearchParams({
    latitude: weather.lat.toString(),
    longitude: weather.lng.toString(),
    current: "temperature_2m,cloud_cover,shortwave_radiation,direct_radiation,weather_code,wind_speed_10m",
    hourly: "temperature_2m,cloud_cover,shortwave_radiation,direct_radiation,diffuse_radiation,sunshine_duration",
    daily: "sunrise,sunset,shortwave_radiation_sum,temperature_2m_max,temperature_2m_min,weather_code",
    timezone: weather.timezone,
    forecast_days: "7",
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWeather(weather: PropertyWeather | null) {
  return useQuery<OpenMeteoResponse>({
    queryKey: ["weather", weather?.lat, weather?.lng],
    queryFn: () => fetchWeatherData(weather!),
    enabled: !!weather,
    staleTime: 15 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
}

// ---------------------------------------------------------------------------
// Solar estimation utilities
// ---------------------------------------------------------------------------

export function estimateKW(
  ghi_w_m2: number,
  system_capacity_kw: number,
  performance_ratio: number,
): number {
  return (ghi_w_m2 / 1000) * system_capacity_kw * performance_ratio;
}

export function estimateDailyKWh(
  hourly_ghi: number[],
  system_capacity_kw: number,
  performance_ratio: number,
): number {
  return hourly_ghi.reduce(
    (sum, ghi) => sum + estimateKW(ghi, system_capacity_kw, performance_ratio),
    0,
  );
}

export const NZ_EMISSION_FACTOR_KG_PER_KWH = 0.098;

// Get hourly indices for today in the given timezone
export function getTodayHourlyIndices(times: string[], timezone: string): number[] {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: timezone }); // "YYYY-MM-DD"
  return times.reduce((acc, t, i) => {
    if (t.startsWith(today)) acc.push(i);
    return acc;
  }, [] as number[]);
}

// Seasonal clear-sky peak GHI for southern hemisphere (Christchurch lat)
export function clearSkyPeakGHI(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  // Summer solstice in NZ ≈ Dec 21 = day 355
  // f(355) = 900, f(172) = 500
  return 700 + 200 * Math.cos((2 * Math.PI * (dayOfYear - 355)) / 365);
}

// Bell-curve clear-sky GHI for a given hour around solar noon
export function clearSkyGHIAtHour(
  hour: number,
  solarNoonHour: number,
  peakGHI: number,
  sunriseHour: number,
  sunsetHour: number,
): number {
  if (hour < sunriseHour || hour > sunsetHour) return 0;
  const sigma = (sunsetHour - sunriseHour) / 5;
  return peakGHI * Math.exp(-0.5 * ((hour - solarNoonHour) / sigma) ** 2);
}

// Solar potential rating from daily GHI sum
export function solarPotentialLabel(ghiSumWhM2: number): {
  label: string;
  color: string;
} {
  if (ghiSumWhM2 > 6000) return { label: "Excellent", color: "#4CAF50" };
  if (ghiSumWhM2 > 4000) return { label: "Good", color: "#8BC34A" };
  if (ghiSumWhM2 > 2000) return { label: "Moderate", color: "#FF9800" };
  return { label: "Poor", color: "#505050" };
}

// WMO weather code → emoji
export function wmoEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 49) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌦️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}
