import { useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import { useProperties } from "@/context/PropertiesContext";
import { estimateKW, getTodayHourlyIndices } from "@/hooks/useWeather";
import { nivoTheme } from "@/lib/nivoTheme";
import EstimatedBadge from "./EstimatedBadge";

export default function GenerationChart() {
  const { property, weatherData, weatherIsLoading } = useProperties();

  const { chartData, currentHour, sunriseHour, sunsetHour } = useMemo(() => {
    if (!weatherData || !property) return { chartData: [], currentHour: -1, sunriseHour: 6, sunsetHour: 18 };

    const timezone = property.weather.timezone;
    const todayIndices = getTodayHourlyIndices(weatherData.hourly.time, timezone);

    const points = todayIndices.map((idx) => {
      const hour = new Date(weatherData.hourly.time[idx]).getHours();
      const ghi = weatherData.hourly.shortwave_radiation[idx] ?? 0;
      const kw = estimateKW(ghi, property.system.capacity_kw, property.system.performance_ratio);
      return { x: hour, y: Math.round(kw * 10) / 10 };
    });

    const now = new Date();
    const curHour = parseInt(
      now.toLocaleString("en-NZ", { hour: "numeric", hour12: false, timeZone: timezone }),
      10,
    );

    const today = weatherData.daily;
    const srHour = today.sunrise[0]
      ? new Date(today.sunrise[0]).getHours()
      : 6;
    const ssHour = today.sunset[0]
      ? new Date(today.sunset[0]).getHours()
      : 18;

    return {
      chartData: [{ id: "Generation", color: "#E31937", data: points }],
      currentHour: curHour,
      sunriseHour: srHour,
      sunsetHour: ssHour,
    };
  }, [weatherData, property]);

  if (weatherIsLoading) {
    return (
      <div className="px-4 py-4 animate-pulse">
        <div className="h-40 bg-[#1A1A1A] rounded" />
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-40 text-[10px] font-mono" style={{ color: "#505050" }}>
        No data
      </div>
    );
  }

  const peakKW = property!.system.peak_output_kw;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end px-4 pt-2">
        <EstimatedBadge />
      </div>
      <div className="flex-1 min-h-0" style={{ height: 200 }}>
        <ResponsiveLine
          data={chartData}
          theme={nivoTheme}
          margin={{ top: 10, right: 20, bottom: 30, left: 50 }}
          xScale={{ type: "linear", min: 0, max: 23 }}
          yScale={{ type: "linear", min: 0, max: peakKW }}
          curve="monotoneX"
          enableArea
          areaOpacity={0.25}
          colors={["#E31937"]}
          lineWidth={2}
          enablePoints={false}
          enableGridX={false}
          gridYValues={5}
          axisBottom={{
            tickValues: [6, 8, 10, 12, 14, 16, 18, 20],
            format: (v: number) => `${v}:00`,
            tickSize: 3,
          }}
          axisLeft={{
            tickValues: 4,
            format: (v: number) => `${v}`,
            legend: "kW",
            legendOffset: -38,
            legendPosition: "middle",
          }}
          layers={[
            "grid",
            // Night shading before sunrise
            ({ xScale, yScale }) => {
              const x0 = (xScale as (v: number) => number)(0);
              const x1 = (xScale as (v: number) => number)(sunriseHour);
              const y0 = (yScale as (v: number) => number)(peakKW);
              const y1 = (yScale as (v: number) => number)(0);
              return (
                <rect
                  x={x0}
                  y={y0}
                  width={x1 - x0}
                  height={y1 - y0}
                  fill="#0A0A0A"
                  opacity={0.6}
                />
              );
            },
            // Night shading after sunset
            ({ xScale, yScale }) => {
              const x0 = (xScale as (v: number) => number)(sunsetHour);
              const x1 = (xScale as (v: number) => number)(23);
              const y0 = (yScale as (v: number) => number)(peakKW);
              const y1 = (yScale as (v: number) => number)(0);
              return (
                <rect
                  x={x0}
                  y={y0}
                  width={x1 - x0}
                  height={y1 - y0}
                  fill="#0A0A0A"
                  opacity={0.6}
                />
              );
            },
            "axes",
            "areas",
            "lines",
            // Current hour marker
            ({ xScale }) => {
              if (currentHour < 0) return null;
              const x = (xScale as (v: number) => number)(currentHour);
              return (
                <line
                  x1={x}
                  x2={x}
                  y1={0}
                  y2={200}
                  stroke="#E31937"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  opacity={0.5}
                />
              );
            },
            "points",
            "crosshair",
            "mesh",
            "legends",
          ]}
          tooltip={({ point }) => (
            <div
              className="px-2 py-1 text-[11px] font-mono"
              style={{
                background: "#1A1A1A",
                border: "1px solid #2A2A2A",
                borderRadius: 4,
                color: "#fff",
              }}
            >
              {point.data.x}:00 — {String(point.data.y)} kW
            </div>
          )}
        />
      </div>
    </div>
  );
}
