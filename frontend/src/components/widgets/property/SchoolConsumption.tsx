import { useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import { useProperties } from "@/context/PropertiesContext";
import { estimateKW, getTodayHourlyIndices } from "@/hooks/useWeather";
import { nivoTheme } from "@/lib/nivoTheme";
import {
  getHourlyDemandProfile,
  getCurrentDemandKW,
  getTodayConsumedKWh,
  getDayType,
} from "@/lib/schoolLoadProfile";
import EstimatedBadge from "../shared/EstimatedBadge";

const DISCLAIMER =
  "Live consumption data requires inverter API connection. Demand profile modeled on NZ secondary school baseline.";

export default function SchoolConsumption() {
  const { property, weatherData, weatherIsLoading } = useProperties();

  const now = new Date();

  const { demandData, genData, currentDemandKW, todayKWh, dayType, currentHour } =
    useMemo(() => {
      const profile = getHourlyDemandProfile(now);
      const demand = profile.map((kw, h) => ({ x: h, y: kw }));

      const curDemand = getCurrentDemandKW(now);
      const todayConsumed = getTodayConsumedKWh(now);
      const dayT = getDayType(now);
      const curHour = now.getHours();

      if (!weatherData || !property) {
        return {
          demandData: demand,
          genData: demand.map((p) => ({ ...p, y: 0 })),
          currentDemandKW: curDemand,
          todayKWh: todayConsumed,
          dayType: dayT,
          currentHour: curHour,
        };
      }

      const timezone = property.weather.timezone;
      const todayIndices = getTodayHourlyIndices(weatherData.hourly.time, timezone);

      // Build hourly generation array aligned with 0–23 hours
      const hourlyGen = Array(24).fill(0);
      todayIndices.forEach((idx) => {
        const hour = new Date(weatherData.hourly.time[idx]).getHours();
        const ghi = weatherData.hourly.shortwave_radiation[idx] ?? 0;
        hourlyGen[hour] = estimateKW(
          ghi,
          property.system.capacity_kw,
          property.system.performance_ratio,
        );
      });

      const gen = hourlyGen.map((kw, h) => ({
        x: h,
        y: Math.round(kw * 10) / 10,
      }));

      return {
        demandData: demand,
        genData: gen,
        currentDemandKW: curDemand,
        todayKWh: todayConsumed,
        dayType: dayT,
        currentHour: curHour,
      };
    }, [weatherData, property]);

  const chartData = [
    { id: "Demand", color: "#FF8C00", data: demandData },
    { id: "Generation", color: "#E31937", data: genData },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Stat pills row */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 flex-wrap">
        <StatPill
          label="Current Demand"
          value={`${currentDemandKW.toFixed(1)} kW`}
          color="#FF8C00"
        />
        <StatPill
          label="Today's Total"
          value={`${todayKWh.toFixed(0)} kWh`}
          color="#A0A0A0"
        />
        <span
          className="px-2 py-1 text-[9px] font-semibold tracking-widest uppercase rounded"
          style={{ background: "#003344", color: "#00BCD4" }}
        >
          {dayType}
        </span>
        <div className="ml-auto">
          <EstimatedBadge />
        </div>
      </div>

      {/* Chart */}
      {weatherIsLoading ? (
        <div className="mx-4 mb-2 h-40 animate-pulse bg-[#1A1A1A] rounded" />
      ) : (
        <>
          <div style={{ height: 190 }}>
            <ResponsiveLine
              data={chartData}
              theme={nivoTheme}
              margin={{ top: 8, right: 20, bottom: 24, left: 50 }}
              xScale={{ type: "linear", min: 0, max: 23 }}
              yScale={{ type: "linear", min: 0, max: 220 }}
              curve="monotoneX"
              colors={["#FF8C00", "#E31937"]}
              lineWidth={2}
              enablePoints={false}
              enableArea={false}
              enableGridX={false}
              gridYValues={4}
              axisBottom={{
                tickValues: [6, 8, 10, 12, 14, 16, 18, 20, 22],
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
                // Fill between demand and generation lines
                ({ series }: Record<string, unknown>) => {
                  const seriesArr = series as Array<{
                    id: string;
                    data: Array<{ position: { x: number; y: number }; data: { y: number } }>;
                  }>;
                  const demandS = seriesArr.find((s) => s.id === "Demand");
                  const genS = seriesArr.find((s) => s.id === "Generation");
                  if (!demandS || !genS) return null;

                  const segments = demandS.data
                    .slice(0, -1)
                    .map((_, i) => {
                      const x1 = demandS.data[i].position.x;
                      const x2 = demandS.data[i + 1].position.x;
                      const dY1 = demandS.data[i].position.y;
                      const dY2 = demandS.data[i + 1].position.y;
                      const gY1 = genS.data[i]?.position.y ?? dY1;
                      const gY2 = genS.data[i + 1]?.position.y ?? dY2;

                      const midDem =
                        (demandS.data[i].data.y + demandS.data[i + 1].data.y) / 2;
                      const midGen =
                        ((genS.data[i]?.data.y ?? 0) + (genS.data[i + 1]?.data.y ?? 0)) / 2;
                      const isExporting = midGen > midDem;

                      return (
                        <polygon
                          key={i}
                          points={`${x1},${dY1} ${x1},${gY1} ${x2},${gY2} ${x2},${dY2}`}
                          fill={
                            isExporting
                              ? "rgba(227,25,55,0.18)"
                              : "rgba(255,140,0,0.13)"
                          }
                        />
                      );
                    });

                  return <g key="between-fill">{segments}</g>;
                },
                "axes",
                "lines",
                // Current hour marker
                ({ xScale }: Record<string, unknown>) => {
                  const scale = xScale as (v: number) => number;
                  const x = scale(currentHour);
                  return (
                    <line
                      key="cur-hour"
                      x1={x}
                      x2={x}
                      y1={0}
                      y2={190}
                      stroke="white"
                      strokeWidth={1}
                      strokeDasharray="4 3"
                      opacity={0.3}
                    />
                  );
                },
                "points",
                "crosshair",
                "mesh",
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
          {/* Legend row — rendered in HTML, not inside Nivo SVG */}
          <div className="flex items-center gap-4 px-[50px] pb-1">
            <LegendItem color="#FF8C00" label="School Demand" />
            <LegendItem color="#E31937" label="Solar Generation" />
          </div>
        </>
      )}

      {/* Connection notice */}
      <p className="px-4 pb-3 text-[9px] italic leading-relaxed" style={{ color: "#505050" }}>
        {DISCLAIMER}
      </p>
    </div>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col px-2.5 py-1 rounded" style={{ background: "#1A1A1A" }}>
      <span className="text-[9px] tracking-wide uppercase" style={{ color: "#505050" }}>
        {label}
      </span>
      <span className="text-[13px] font-bold font-mono tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block w-2 h-2 rounded-full shrink-0"
        style={{ background: color }}
      />
      <span className="text-[10px]" style={{ color: "#A0A0A0" }}>
        {label}
      </span>
    </div>
  );
}
