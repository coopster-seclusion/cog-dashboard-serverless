import WidgetCard from "@/components/layout/WidgetCard";
import PropertyHeader from "@/components/widgets/PropertyHeader";
import EstimatedOutput from "@/components/widgets/EstimatedOutput";
import WeatherNow from "@/components/widgets/WeatherNow";
import AnnualProgress from "@/components/widgets/AnnualProgress";
import CarbonOffset from "@/components/widgets/CarbonOffset";
import GenerationChart from "@/components/widgets/GenerationChart";
import SolarIrradianceChart from "@/components/widgets/SolarIrradianceChart";
import SchoolConsumption from "@/components/widgets/SchoolConsumption";
import GridExport from "@/components/widgets/GridExport";
import SystemStats from "@/components/widgets/SystemStats";
import PPADetails from "@/components/widgets/PPADetails";
import WeatherForecast from "@/components/widgets/WeatherForecast";

export default function COGProperties() {
  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Property header bar — full width, not a WidgetCard */}
      <PropertyHeader />

      {/* Grid body */}
      <div className="grid grid-cols-12 gap-3 p-4 auto-rows-min">

        {/* ── ROW 1: Current Status Strip ── */}
        <WidgetCard title="Current Output" colSpan={3}>
          <EstimatedOutput />
        </WidgetCard>

        <WidgetCard title="Weather Now" colSpan={3}>
          <WeatherNow />
        </WidgetCard>

        <WidgetCard title="Annual Generation Target" colSpan={3}>
          <AnnualProgress />
        </WidgetCard>

        <WidgetCard title="Est. CO₂ Avoided" colSpan={3}>
          <CarbonOffset />
        </WidgetCard>

        {/* ── ROW 2: Generation Chart + Solar Irradiance ── */}
        <WidgetCard
          title="Today's Estimated Generation"
          subtitle="Hourly kW estimate from GHI"
          colSpan={7}
        >
          <GenerationChart />
        </WidgetCard>

        <WidgetCard
          title="Solar Irradiance — Today"
          subtitle="Actual vs clear sky reference"
          colSpan={5}
        >
          <SolarIrradianceChart />
        </WidgetCard>

        {/* ── ROW 2.5: School Consumption + Grid Export ── */}
        <WidgetCard title="School Consumption" colSpan={6}>
          <SchoolConsumption />
        </WidgetCard>

        <WidgetCard title="Grid Export" colSpan={6}>
          <GridExport />
        </WidgetCard>

        {/* ── ROW 3: System Details + PPA + 7-Day Forecast ── */}
        <WidgetCard title="System Specifications" colSpan={4}>
          <SystemStats />
        </WidgetCard>

        <WidgetCard title="Power Purchase Agreement" colSpan={3}>
          <PPADetails />
        </WidgetCard>

        <WidgetCard title="7-Day Solar Forecast" colSpan={5}>
          <WeatherForecast />
        </WidgetCard>

      </div>
    </div>
  );
}
