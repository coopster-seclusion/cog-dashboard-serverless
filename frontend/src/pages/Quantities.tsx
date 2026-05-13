import DashboardGrid from "@/components/layout/DashboardGrid";
import WidgetCard from "@/components/layout/WidgetCard";
import IslandBalance from "@/components/widgets/IslandBalance";
import IntermittentShare from "@/components/widgets/IntermittentShare";
import ForwardCurve from "@/components/widgets/ForwardCurve";

export default function Quantities() {
  return (
    <DashboardGrid>
      <WidgetCard title="Island Balance" subtitle="Generation vs Load · MW" colSpan={2}>
        <IslandBalance />
      </WidgetCard>

      <WidgetCard title="Intermittent Share" subtitle="Wind + solar % of generation">
        <IntermittentShare />
      </WidgetCard>

      <WidgetCard title="Forward Price Curve" subtitle="PRSL · next 7 TPs" colSpan={2}>
        <ForwardCurve />
      </WidgetCard>
    </DashboardGrid>
  );
}
