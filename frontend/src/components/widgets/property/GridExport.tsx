import { useMemo } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { useProperties } from "@/context/PropertiesContext";
import { estimateKW, getTodayHourlyIndices } from "@/hooks/useWeather";
import { nivoTheme } from "@/lib/nivoTheme";
import {
  getHourlyDemandProfile,
  getCurrentDemandKW,
  getGridExportKW,
  getGridImportKW,
  get24hExportKWh,
  getSelfConsumptionRatio,
} from "@/lib/schoolLoadProfile";
import EstimatedBadge from "../shared/EstimatedBadge";

const DISCLAIMER =
  "Live consumption data requires inverter API connection. Demand profile modeled on NZ secondary school baseline.";

const BAR_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export default function GridExport() {
  const { property, weatherData, weatherIsLoading } = useProperties();

  const now = new Date();

  const {
    currentExportKW,
    currentImportKW,
    exportTodayKWh,
    selfConsumptionPct,
    barData,
    currentGenKW,
    currentDemandKW,
  } = useMemo(() => {
    const profile = getHourlyDemandProfile(now);
    const curDemand = getCurrentDemandKW(now);

    if (!weatherData || !property) {
      return {
        currentExportKW: 0,
        currentImportKW: curDemand,
        exportTodayKWh: 0,
        selfConsumptionPct: 0,
        barData: BAR_HOURS.map((h) => ({
          hour: `${h}`,
          export: 0,
          import: profile[h] ?? 0,
        })),
        currentGenKW: 0,
        currentDemandKW: curDemand,
      };
    }

    const timezone = property.weather.timezone;
    const todayIndices = getTodayHourlyIndices(weatherData.hourly.time, timezone);

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

    const curGHI = weatherData.current.shortwave_radiation;
    const curGen = estimateKW(
      curGHI,
      property.system.capacity_kw,
      property.system.performance_ratio,
    );

    const bars = BAR_HOURS.map((h) => ({
      hour: `${h}`,
      export: Math.round(getGridExportKW(hourlyGen[h], profile[h]) * 10) / 10,
      import: Math.round(getGridImportKW(hourlyGen[h], profile[h]) * 10) / 10,
    }));

    return {
      currentExportKW: getGridExportKW(curGen, curDemand),
      currentImportKW: getGridImportKW(curGen, curDemand),
      exportTodayKWh: get24hExportKWh(hourlyGen, profile),
      selfConsumptionPct: getSelfConsumptionRatio(hourlyGen, profile),
      barData: bars,
      currentGenKW: curGen,
      currentDemandKW: curDemand,
    };
  }, [weatherData, property]);

  const isExporting = currentExportKW > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Stat pills */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 flex-wrap">
        <StatPill
          label={isExporting ? "Exporting to Grid" : "Grid Export"}
          value={`${currentExportKW.toFixed(1)} kW`}
          color={isExporting ? "#E31937" : "#505050"}
        />
        <StatPill
          label="Importing from Grid"
          value={`${currentImportKW.toFixed(1)} kW`}
          color={currentImportKW > 0 ? "#FF8C00" : "#505050"}
        />
        <StatPill
          label="24h Export"
          value={`${exportTodayKWh.toFixed(0)} kWh`}
          color="#A0A0A0"
        />
        <StatPill
          label="Self-Consumption"
          value={`${selfConsumptionPct.toFixed(0)}%`}
          color="#4CAF50"
        />
        <div className="ml-auto">
          <EstimatedBadge />
        </div>
      </div>

      {/* Bar chart */}
      {weatherIsLoading ? (
        <div className="mx-4 mb-2 h-36 animate-pulse bg-[#1A1A1A] rounded" />
      ) : (
        <>
          <div style={{ height: 150 }}>
            <ResponsiveBar
              data={barData}
              keys={["export", "import"]}
              indexBy="hour"
              groupMode="grouped"
              theme={nivoTheme}
              margin={{ top: 8, right: 20, bottom: 24, left: 46 }}
              colors={["#E31937", "#FF8C00"]}
              borderRadius={1}
              enableLabel={false}
              enableGridX={false}
              gridYValues={3}
              axisBottom={{
                tickSize: 3,
                tickValues: BAR_HOURS.filter((h) => h % 2 === 0).map(String),
                format: (v: string) => `${v}:00`,
              }}
              axisLeft={{
                tickValues: 3,
                legend: "kW",
                legendOffset: -38,
                legendPosition: "middle",
              }}
              markers={[
                {
                  axis: "y",
                  value: 0,
                  lineStyle: {
                    stroke: "#2A2A2A",
                    strokeWidth: 1,
                    strokeDasharray: "4 3",
                  },
                  legend: "NET ZERO",
                  legendPosition: "top-left",
                  textStyle: { fill: "#303030", fontSize: 9 },
                },
              ]}
              tooltip={({ id, value, indexValue }) => (
                <div
                  className="px-2 py-1 text-[11px] font-mono"
                  style={{
                    background: "#1A1A1A",
                    border: "1px solid #2A2A2A",
                    borderRadius: 4,
                    color: "#fff",
                  }}
                >
                  {indexValue}:00 — {id === "export" ? "Export" : "Import"}: {value} kW
                </div>
              )}
            />
          </div>
          {/* Legend row — rendered in HTML, not inside Nivo SVG */}
          <div className="flex items-center gap-4 px-[46px] pb-1">
            <LegendItem color="#E31937" label="Export to Grid" />
            <LegendItem color="#FF8C00" label="Import from Grid" />
          </div>
        </>
      )}

      {/* Flow diagram */}
      <div className="px-4 py-2">
        <FlowDiagram
          genKW={currentGenKW}
          demandKW={currentDemandKW}
          exportKW={currentExportKW}
          importKW={currentImportKW}
          systemCapacityKW={property?.system.capacity_kw ?? 203.4}
        />
      </div>

      {/* Disclaimer */}
      <p className="px-4 pb-3 text-[9px] italic leading-relaxed" style={{ color: "#505050" }}>
        {DISCLAIMER}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flow diagram
// ---------------------------------------------------------------------------

function FlowDiagram({
  genKW,
  demandKW,
  exportKW,
  importKW,
  systemCapacityKW,
}: {
  genKW: number;
  demandKW: number;
  exportKW: number;
  importKW: number;
  systemCapacityKW: number;
}) {
  const isExporting = exportKW > 0;

  return (
    <div className="flex items-center justify-between gap-1 py-1">
      {/* Solar box */}
      <FlowBox
        label="Solar Array"
        value={`${systemCapacityKW} kW`}
        color="#E31937"
        dimmed={genKW === 0}
      />

      {/* Solar → School arrow (always right) */}
      <Arrow direction="right" color="#E31937" dimmed={genKW === 0} />

      {/* School box */}
      <FlowBox
        label="School"
        value={`${demandKW.toFixed(1)} kW`}
        color="#FF8C00"
      />

      {/* School ↔ Grid arrow */}
      <Arrow direction={isExporting ? "right" : "left"} color={isExporting ? "#E31937" : "#FF8C00"} />

      {/* Grid box */}
      <FlowBox
        label="Grid"
        value={isExporting ? `+${exportKW.toFixed(1)} kW` : `-${importKW.toFixed(1)} kW`}
        color="#00BCD4"
        dimmed={!isExporting && importKW === 0}
      />
    </div>
  );
}

function FlowBox({
  label,
  value,
  color,
  dimmed = false,
}: {
  label: string;
  value: string;
  color: string;
  dimmed?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center px-2 py-1 rounded min-w-[72px] text-center"
      style={{
        background: "#1A1A1A",
        border: `1px solid ${dimmed ? "#1A1A1A" : color}`,
        opacity: dimmed ? 0.4 : 1,
        transition: "opacity 0.3s",
      }}
    >
      <span className="text-[8px] tracking-widest uppercase" style={{ color: "#505050" }}>
        {label}
      </span>
      <span className="text-[11px] font-bold font-mono tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function Arrow({
  direction,
  color,
  dimmed = false,
}: {
  direction: "left" | "right";
  color: string;
  dimmed?: boolean;
}) {
  return (
    <div
      className="flex items-center text-[16px] font-bold select-none"
      style={{ color, opacity: dimmed ? 0.25 : 0.8, transition: "all 0.3s" }}
    >
      {direction === "right" ? "→" : "←"}
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
