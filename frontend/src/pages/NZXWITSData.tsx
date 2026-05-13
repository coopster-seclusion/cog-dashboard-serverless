import WidgetCard from "@/components/layout/WidgetCard";
import NodeTicker from "@/components/widgets/NodeTicker";
import EnergyGeneration from "@/components/widgets/EnergyGeneration";
import EnergyDemand from "@/components/widgets/EnergyDemand";
import NIReserves from "@/components/widgets/NIReserves";
import SIReserves from "@/components/widgets/SIReserves";
import RTDPriceMap from "@/components/widgets/RTDPriceMap";
import PriceChart from "@/components/widgets/PriceChart";
import ScheduleOverlay from "@/components/widgets/ScheduleOverlay";
import { useDashboard } from "@/context/WITSContext";

// The first three selected nodes drive Row 1 tickers (up to 3 shown)
const TICKER_FALLBACK = ["OTA2201", "HAY2201", "BEN2201"];

export default function NZXWITSData() {
  const { state } = useDashboard();

  // Use selected nodes for tickers, padded to exactly 3
  const tickerNodes = [
    state.nodes[0] ?? TICKER_FALLBACK[0],
    state.nodes[1] ?? TICKER_FALLBACK[1],
    state.nodes[2] ?? TICKER_FALLBACK[2],
  ];

  return (
    <div className="grid grid-cols-12 gap-3 p-4 auto-rows-min">

      {/* ── ROW 1: Latest Price KPIs — always LIVE RTD ── */}
      {tickerNodes.map((nodeId) => (
        <WidgetCard
          key={nodeId}
          title={nodeId}
          rightContent="RTD · Live"
          live
          colSpan={4}
        >
          <NodeTicker nodeId={nodeId} />
        </WidgetCard>
      ))}

      {/* ── ROW 2: Island Balance — always LIVE PRSS ── */}
      <WidgetCard title="Energy Generation" live colSpan={3}>
        <EnergyGeneration />
      </WidgetCard>

      <WidgetCard title="Energy Demand" live colSpan={3}>
        <EnergyDemand />
      </WidgetCard>

      <WidgetCard title="NI Reserves" live colSpan={3}>
        <NIReserves />
      </WidgetCard>

      <WidgetCard title="SI Reserves" live colSpan={3}>
        <SIReserves />
      </WidgetCard>

      {/* ── ROW 3: RTD Price Map + Spot Prices Chart ── */}
      <WidgetCard
        title="RTD Price Map"
        live
        colSpan={7}
      >
        <RTDPriceMap />
      </WidgetCard>

      <WidgetCard
        title="Spot Prices"
        subtitle={`${state.schedule} · ${state.nodes.join(", ")}`}
        colSpan={5}
      >
        <PriceChart />
      </WidgetCard>

      {/* ── ROW 4: RTD vs Pre-Dispatch Overlay ── */}
      <WidgetCard
        title="RTD vs Pre-Dispatch"
        subtitle="PRSL forward 4 TPs"
        colSpan={12}
      >
        <ScheduleOverlay />
      </WidgetCard>
    </div>
  );
}
