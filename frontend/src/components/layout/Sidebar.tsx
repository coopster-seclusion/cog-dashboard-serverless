import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard, type Island, type MarketType } from "@/context/DashboardContext";

const COMMON_NODES = [
  "OTA2201",
  "HAY2201",
  "BEN2201",
  "ISL2201",
  "INV2201",
  "TKU2201",
  "WKM2201",
  "HLY2201",
];

const SCHEDULES = ["RTD", "Interim", "Final", "PRSL", "PRSS", "NRSL", "NRSS", "WDS"];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { state, setState } = useDashboard();

  // Draft local state — committed only on APPLY
  const [nodes, setNodes] = useState<string[]>(state.nodes);
  const [island, setIsland] = useState<Island>(state.island);
  const [schedule, setSchedule] = useState(state.schedule);
  const [marketType, setMarketType] = useState<MarketType>(state.marketType);
  const [autoRefresh, setAutoRefresh] = useState(state.autoRefresh);
  const [refreshInterval, setRefreshInterval] = useState(state.refreshInterval);

  function toggleNode(node: string) {
    setNodes((prev) =>
      prev.includes(node) ? prev.filter((n) => n !== node) : [...prev, node]
    );
  }

  function handleApply() {
    setState({ nodes, island, schedule, marketType, autoRefresh, refreshInterval });
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/50"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-20 h-full w-60",
          "flex flex-col bg-[#111111] border-r border-[#2A2A2A]",
          "transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-[#2A2A2A] shrink-0">
          <span className="text-[11px] font-medium tracking-widest uppercase text-[#A0A0A0]">
            Filters
          </span>
          <button
            onClick={onClose}
            className="text-[#505050] hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">

          {/* Nodes */}
          <section>
            <p className="text-[10px] tracking-widest uppercase text-[#505050] mb-2">Nodes</p>
            <div className="space-y-2">
              {COMMON_NODES.map((node) => (
                <label key={node} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={nodes.includes(node)}
                    onChange={() => toggleNode(node)}
                    className="accent-[#E31937] h-3 w-3 shrink-0"
                  />
                  <span
                    className={cn(
                      "font-mono text-[11px] transition-colors",
                      nodes.includes(node)
                        ? "text-white"
                        : "text-[#505050] group-hover:text-[#A0A0A0]"
                    )}
                  >
                    {node}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Island */}
          <section>
            <p className="text-[10px] tracking-widest uppercase text-[#505050] mb-2">Island</p>
            <div className="flex gap-1">
              {(["BOTH", "NI", "SI"] as Island[]).map((i) => (
                <button
                  key={i}
                  onClick={() => setIsland(i)}
                  className={cn(
                    "flex-1 py-1 text-[11px] font-medium tracking-wider rounded transition-colors",
                    island === i
                      ? "bg-[#E31937] text-white"
                      : "bg-[#1A1A1A] text-[#505050] hover:text-[#A0A0A0]"
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          </section>

          {/* Schedule */}
          <section>
            <p className="text-[10px] tracking-widest uppercase text-[#505050] mb-2">Schedule</p>
            <select
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white text-[11px] rounded px-2 py-1.5 focus:outline-none focus:border-[#E31937] transition-colors"
            >
              {SCHEDULES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </section>

          {/* Market type */}
          <section>
            <p className="text-[10px] tracking-widest uppercase text-[#505050] mb-2">Market</p>
            <div className="flex gap-1">
              {(["E", "R"] as MarketType[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMarketType(m)}
                  className={cn(
                    "flex-1 py-1 text-[11px] font-medium tracking-wider rounded transition-colors",
                    marketType === m
                      ? "bg-[#E31937] text-white"
                      : "bg-[#1A1A1A] text-[#505050] hover:text-[#A0A0A0]"
                  )}
                >
                  {m === "E" ? "ENERGY" : "RESERVES"}
                </button>
              ))}
            </div>
          </section>

          {/* Auto-refresh */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] tracking-widest uppercase text-[#505050]">
                Auto-refresh
              </p>
              <button
                onClick={() => setAutoRefresh((v) => !v)}
                className={cn(
                  "relative inline-flex h-4 w-7 items-center rounded-full transition-colors",
                  autoRefresh ? "bg-[#E31937]" : "bg-[#2A2A2A]"
                )}
                aria-label="Toggle auto-refresh"
              >
                <span
                  className={cn(
                    "inline-block h-3 w-3 rounded-full bg-white transition-transform",
                    autoRefresh ? "translate-x-3.5" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>
            {autoRefresh && (
              <div className="flex gap-1">
                {([30, 60, 300] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setRefreshInterval(s)}
                    className={cn(
                      "flex-1 py-1 text-[11px] rounded border transition-colors",
                      refreshInterval === s
                        ? "border-[#E31937] text-white bg-[#1A1A1A]"
                        : "border-[#2A2A2A] text-[#505050] bg-[#1A1A1A] hover:text-[#A0A0A0]"
                    )}
                  >
                    {s === 300 ? "5m" : `${s}s`}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Apply */}
        <div className="px-4 py-4 border-t border-[#2A2A2A] shrink-0">
          <button
            onClick={handleApply}
            className="w-full py-2 bg-[#E31937] hover:bg-[#cc1630] text-white text-[11px] font-semibold tracking-widest uppercase rounded transition-colors"
          >
            Apply
          </button>
        </div>
      </aside>
    </>
  );
}
