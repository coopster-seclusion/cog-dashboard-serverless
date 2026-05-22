import DashboardGrid from "@/components/layout/DashboardGrid";
import WidgetCard from "@/components/layout/WidgetCard";
import PriceChart from "@/components/widgets/wits/PriceChart";
import PriceKPIs from "@/components/widgets/wits/PriceKPIs";
import PriceSpread from "@/components/widgets/wits/PriceSpread";
import ScheduleOverlay from "@/components/widgets/wits/ScheduleOverlay";

export default function Prices() {
  return (
    <DashboardGrid>
      {/* Row 1 */}
      <WidgetCard title="Spot Prices" subtitle="RTD · Energy · $/MWh" live colSpan={2}>
        <PriceChart />
      </WidgetCard>

      <WidgetCard title="Latest Prices" subtitle="Current $/MWh per node" live>
        <PriceKPIs />
      </WidgetCard>

      {/* Row 2 */}
      <WidgetCard title="NI / SI Spread" subtitle="HAY2201 − BEN2201 · $/MWh" live>
        <PriceSpread />
      </WidgetCard>

      <WidgetCard title="RTD vs Pre-dispatch" subtitle="RTD + PRSL overlay" live colSpan={2}>
        <ScheduleOverlay />
      </WidgetCard>
    </DashboardGrid>
  );
}
