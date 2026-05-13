import WidgetCard from "@/components/layout/WidgetCard";

export default function FinancialOverview() {
  return (
    <div className="grid grid-cols-12 gap-3 p-4 auto-rows-min">
      <WidgetCard
        title="Consolidated Financials"
        subtitle="Portfolio-level revenue, costs & PPA summary"
        colSpan={12}
      >
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <p className="text-[11px] font-medium tracking-widest uppercase" style={{ color: "#505050" }}>
            Financial data coming soon
          </p>
          <p className="text-[11px] max-w-sm text-center leading-relaxed" style={{ color: "#303030" }}>
            This card will display consolidated revenue, cost savings, PPA billing
            summaries, and return-on-investment metrics across all COG properties.
          </p>
        </div>
      </WidgetCard>
    </div>
  );
}
