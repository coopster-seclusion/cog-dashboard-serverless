import { useState, useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar } from "@nivo/bar";
import { useProperties } from "@/context/PropertiesContext";
import { useSolarHistory, type HistoryPeriod } from "@/hooks/useSolarHistory";
import { nivoTheme } from "@/lib/nivoTheme";

const PERIODS: { key: HistoryPeriod; label: string }[] = [
  { key: "day",   label: "Day"   },
  { key: "week",  label: "Week"  },
  { key: "month", label: "Month" },
  { key: "year",  label: "Year"  },
];

export default function GenerationChart() {
  const { property } = useProperties();
  const [period, setPeriod] = useState<HistoryPeriod>("day");
  const { data: history, isLoading, isError } = useSolarHistory(property?.solar_ps_id, period);

  const now = new Date();
  const currentLabel = `${String(now.getHours()).padStart(2, "0")}:${String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, "0")}`;

  const lineData = useMemo(() => {
    if (!history || period !== "day") return [];
    return [{ id: "Power", data: history.points.map(p => ({ x: p.label, y: p.value })) }];
  }, [history, period]);

  const wholHourTicks = useMemo(
    () => history?.points.filter(p => p.label.endsWith(":00")).map(p => p.label) ?? [],
    [history],
  );

  const isEmpty = !history?.points.length;

  return (
    <div className="flex flex-col h-full">
      {/* Period selector */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-1">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className="px-3 py-1 text-[11px] tracking-widest uppercase rounded transition-colors"
              style={{
                background: period === key ? "#E31937" : "#1A1A1A",
                color:      period === key ? "#fff"    : "#606060",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[10px] tracking-widest uppercase" style={{ color: "#404040" }}>
          {history?.unit === "kW" ? "Power kW" : "Energy kWh"}
        </span>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="mx-4 mb-4 animate-pulse rounded" style={{ height: 220, background: "#1A1A1A" }} />
      ) : isError || isEmpty ? (
        <div className="flex items-center justify-center" style={{ height: 220, color: "#404040" }}>
          <span className="text-[10px] font-mono tracking-widest uppercase">No data</span>
        </div>
      ) : period === "day" ? (
        <div style={{ height: 220 }}>
          <ResponsiveLine
            data={lineData}
            theme={nivoTheme}
            margin={{ top: 8, right: 20, bottom: 30, left: 50 }}
            xScale={{ type: "point" }}
            yScale={{ type: "linear", min: 0, max: "auto" }}
            curve="monotoneX"
            enableArea
            areaOpacity={0.15}
            colors={["#E31937"]}
            lineWidth={2}
            enablePoints={false}
            enableGridX={false}
            gridYValues={4}
            axisBottom={{
              tickValues: wholHourTicks,
              format: (v: string) => v,
              tickSize: 3,
            }}
            axisLeft={{
              tickValues: 4,
              legend: "kW",
              legendOffset: -38,
              legendPosition: "middle",
            }}
            layers={[
              "grid",
              ({ xScale, innerHeight }: { xScale: (v: string) => number | undefined; innerHeight: number }) => {
                const x = xScale(currentLabel);
                if (x == null) return null;
                return (
                  <line
                    x1={x} x2={x} y1={0} y2={innerHeight}
                    stroke="#606060" strokeWidth={1} strokeDasharray="3 3"
                  />
                );
              },
              "axes",
              "areas",
              "lines",
              "crosshair",
              "mesh",
            ]}
            tooltip={({ point }) => (
              <div
                className="px-2 py-1 text-[11px] font-mono"
                style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 4, color: "#fff" }}
              >
                {point.data.x as string} — {point.data.y as number} kW
              </div>
            )}
          />
        </div>
      ) : (
        <div style={{ height: 220 }}>
          <ResponsiveBar
            data={history!.points.map(p => ({ label: p.label, value: p.value }))}
            keys={["value"]}
            indexBy="label"
            theme={nivoTheme}
            margin={{ top: 8, right: 20, bottom: period === "month" ? 48 : 30, left: 50 }}
            colors={["#E31937"]}
            borderRadius={2}
            enableLabel={false}
            enableGridX={false}
            gridYValues={4}
            axisBottom={{
              tickSize: 3,
              tickRotation: period === "month" ? -45 : 0,
            }}
            axisLeft={{
              tickValues: 4,
              legend: "kWh",
              legendOffset: -38,
              legendPosition: "middle",
            }}
            tooltip={({ indexValue, value }) => (
              <div
                className="px-2 py-1 text-[11px] font-mono"
                style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 4, color: "#fff" }}
              >
                {indexValue} — {value} kWh
              </div>
            )}
          />
        </div>
      )}
    </div>
  );
}
