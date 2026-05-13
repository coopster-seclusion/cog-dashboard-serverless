import DashboardGrid from "@/components/layout/DashboardGrid";
import WidgetCard from "@/components/layout/WidgetCard";

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

export default function Quantities() {
  return (
    <DashboardGrid>
      {/* Row 1 */}
      <WidgetCard title="Island Balance" subtitle="Generation vs Load · MW" colSpan={2}>
        <Placeholder label="IslandBalance.tsx" />
      </WidgetCard>

      <WidgetCard title="Intermittent Share" subtitle="Wind + solar % of generation">
        <Placeholder label="IntermittentShare.tsx" />
      </WidgetCard>

      {/* Row 2 */}
      <WidgetCard title="Forward Price Curve" subtitle="PRSL · next 7 TPs" colSpan={2}>
        <Placeholder label="ForwardCurve.tsx" />
      </WidgetCard>
    </DashboardGrid>
  );
}
