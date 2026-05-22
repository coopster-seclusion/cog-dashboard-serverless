import { useState } from "react";
import WidgetCard from "@/components/layout/WidgetCard";
import PropertyHeader from "@/components/widgets/property/PropertyHeader";
import CurrentOutput from "@/components/widgets/property/CurrentOutput";
import WeatherNow from "@/components/widgets/property/WeatherNow";
import AnnualProgress from "@/components/widgets/property/AnnualProgress";
import CarbonOffset from "@/components/widgets/property/CarbonOffset";
import GenerationChart from "@/components/widgets/property/GenerationChart";
import SolarIrradianceChart from "@/components/widgets/property/SolarIrradianceChart";
import SystemStats from "@/components/widgets/property/SystemStats";
import PPADetails from "@/components/widgets/property/PPADetails";
import WeatherForecast from "@/components/widgets/property/WeatherForecast";
import { useProperties } from "@/context/PropertiesContext";

export default function COGProperties() {
  const { allProperties, setSelectedPropertyId } = useProperties();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggle(id: string) {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next) setSelectedPropertyId(next);
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      {allProperties.map((property) => (
        <div key={property.id}>
          <PropertyHeader
            property={property}
            isExpanded={expandedId === property.id}
            onToggle={() => toggle(property.id)}
          />

          {expandedId === property.id && property.id === "hornby-high-school" && (
            <div className="grid grid-cols-12 gap-3 p-4 auto-rows-min"
              style={{ background: "#0D0D0D" }}
            >
              {/* ROW 1: Status strip */}
              <WidgetCard title="Current Output" colSpan={3}>
                <CurrentOutput />
              </WidgetCard>

              <WidgetCard title="Weather Now" colSpan={3}>
                <WeatherNow />
              </WidgetCard>

              <WidgetCard title="7-Day Solar Forecast" colSpan={6}>
                <WeatherForecast />
              </WidgetCard>

              {/* ROW 2: Charts */}
              <WidgetCard title="PV Generation" colSpan={7}>
                <GenerationChart />
              </WidgetCard>

              <WidgetCard
                title="Solar Irradiance — Today"
                subtitle="Actual vs clear sky reference"
                colSpan={5}
              >
                <SolarIrradianceChart />
              </WidgetCard>

              {/* ROW 3: System details + annual targets */}
              <WidgetCard title="System Specifications" colSpan={4}>
                <SystemStats />
              </WidgetCard>

              <WidgetCard title="Power Purchase Agreement" colSpan={3}>
                <PPADetails />
              </WidgetCard>

              <WidgetCard title="Annual Generation Target" colSpan={3}>
                <AnnualProgress />
              </WidgetCard>

              <WidgetCard title="Est. CO₂ Avoided" colSpan={2}>
                <CarbonOffset />
              </WidgetCard>
            </div>
          )}

          {expandedId === property.id && property.id !== "hornby-high-school" && (
            <div
              className="flex items-center justify-center py-10"
              style={{ background: "#0D0D0D", borderBottom: "1px solid #2A2A2A" }}
            >
              <span className="text-xs tracking-widest uppercase" style={{ color: "#404040" }}>
                Widget dashboard — coming soon
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
