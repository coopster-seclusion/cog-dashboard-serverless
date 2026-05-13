import DashboardGrid from "@/components/layout/DashboardGrid";
import WidgetCard from "@/components/layout/WidgetCard";
import PriceChart from "@/components/widgets/PriceChart";

function Placeholder({ label, height = 200 }: { label: string; height?: number }) {
  return (
    <div
      className="flex items-center justify-center font-mono text-[11px] text-[#2A2A2A]"
      style={{ height }}
    >
      {label}
    </div>
  );
}

export default function Prices() {
  return (
    <DashboardGrid>
      {/* Row 1 */}
      <WidgetCard title="Spot Prices" subtitle="RTD · Energy · $/MWh" live colSpan={2}>
        <PriceChart />
      </WidgetCard>

      <WidgetCard title="Latest Prices" subtitle="Current $/MWh per node" live>
        <Placeholder label="PriceKPIs.tsx" height={120} />
      </WidgetCard>

      {/* Row 2 */}
      <WidgetCard title="NI / SI Spread" subtitle="HAY2201 − BEN2201 · $/MWh" live>
        <Placeholder label="PriceSpread.tsx" />
      </WidgetCard>

      <WidgetCard title="RTD vs Pre-dispatch" subtitle="RTD + PRSL overlay" live colSpan={2}>
        <Placeholder label="ScheduleOverlay.tsx" />
      </WidgetCard>
    </DashboardGrid>
  );
}
