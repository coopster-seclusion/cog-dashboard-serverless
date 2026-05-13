import { useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import { useProperties } from "@/context/PropertiesContext";
import { getTodayHourlyIndices, clearSkyPeakGHI, clearSkyGHIAtHour } from "@/hooks/useWeather";
import { nivoTheme } from "@/lib/nivoTheme";

// Solar noon for Christchurch ≈ 12:45 NZST
const SOLAR_NOON_HOUR = 12.75;

export default function SolarIrradianceChart() {
  const { property, weatherData, weatherIsLoading } = useProperties();

  const { chartData, sunriseHour, sunsetHour } = useMemo(() => {
    if (!weatherData || !property) return { chartData: [], sunriseHour: 6, sunsetHour: 18 };

    const timezone = property.weather.timezone;
    const todayIndices = getTodayHourlyIndices(weatherData.hourly.time, timezone);

    const today = weatherData.daily;
    const srHour = today.sunrise[0] ? new Date(today.sunrise[0]).getHours() : 6;
    const ssHour = today.sunset[0] ? new Date(today.sunset[0]).getHours() : 18;
    const peakGHI = clearSkyPeakGHI(new Date());

    const actualPoints = todayIndices.map((idx) => ({
      x: new Date(weatherData.hourly.time[idx]).getHours(),
      y: Math.round(weatherData.hourly.shortwave_radiation[idx] ?? 0),
    }));

    const clearSkyPoints = todayIndices.map((idx) => {
      const hour = new Date(weatherData.hourly.time[idx]).getHours();
      return {
        x: hour,
        y: Math.round(clearSkyGHIAtHour(hour, SOLAR_NOON_HOUR, peakGHI, srHour, ssHour)),
      };
    });

    return {
      chartData: [
        { id: "Actual GHI", color: "#E31937", data: actualPoints },
        { id: "Clear Sky", color: "#FFFFFF", data: clearSkyPoints },
      ],
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

  return (
    <div style={{ height: 220 }}>
      <ResponsiveLine
        data={chartData}
        theme={nivoTheme}
        margin={{ top: 10, right: 20, bottom: 30, left: 50 }}
        xScale={{ type: "linear", min: 0, max: 23 }}
        yScale={{ type: "linear", min: 0, max: 1000 }}
        curve="monotoneX"
        colors={["#E31937", "#505050"]}
        lineWidth={2}
        enablePoints={false}
        enableArea={false}
        enableGridX={false}
        gridYValues={5}
        defs={[
          {
            id: "clearSkyDash",
            type: "patternLines",
            spacing: 4,
            rotation: -45,
            lineWidth: 1,
            color: "#FFFFFF",
          },
        ]}
        axisBottom={{
          tickValues: [6, 8, 10, 12, 14, 16, 18, 20],
          format: (v: number) => `${v}:00`,
          tickSize: 3,
        }}
        axisLeft={{
          tickValues: 5,
          format: (v: number) => `${v}`,
          legend: "W/m²",
          legendOffset: -42,
          legendPosition: "middle",
        }}
        layers={[
          "grid",
          // Night shade before sunrise
          ({ xScale, yScale }) => {
            const x0 = (xScale as (v: number) => number)(0);
            const x1 = (xScale as (v: number) => number)(sunriseHour);
            const y0 = (yScale as (v: number) => number)(1000);
            const y1 = (yScale as (v: number) => number)(0);
            return <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="#0A0A0A" opacity={0.6} />;
          },
          // Night shade after sunset
          ({ xScale, yScale }) => {
            const x0 = (xScale as (v: number) => number)(sunsetHour);
            const x1 = (xScale as (v: number) => number)(23);
            const y0 = (yScale as (v: number) => number)(1000);
            const y1 = (yScale as (v: number) => number)(0);
            return <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="#0A0A0A" opacity={0.6} />;
          },
          "axes",
          "lines",
          "points",
          "crosshair",
          "mesh",
          "legends",
        ]}
        legends={[
          {
            anchor: "top-right",
            direction: "row",
            itemWidth: 90,
            itemHeight: 14,
            itemsSpacing: 8,
            symbolSize: 10,
            symbolShape: "circle",
            itemTextColor: "#A0A0A0",
            translateX: -10,
            translateY: 0,
            data: [
              { id: "Actual GHI", label: "Actual GHI", color: "#E31937" },
              { id: "Clear Sky", label: "Clear Sky", color: "#505050" },
            ],
          },
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
            {point.data.x}:00 — {String(point.data.y)} W/m²
          </div>
        )}
      />
    </div>
  );
}
