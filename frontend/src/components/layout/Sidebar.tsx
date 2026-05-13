import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { X, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard, type MarketType } from "@/context/WITSContext";
import { TIME_RANGE_CONFIG } from "@/lib/timeRangeConfig";
import {
  SCHEDULE_CONFIG,
  SCHEDULES_BY_TIME_RANGE,
  sanitiseOnScheduleChange,
} from "@/lib/scheduleConfig";

// Nodes grouped by island
const NI_NODES = ["OTA2201", "HAY2201", "WKM2201", "STK0111", "MRT2201", "TAU2201"];
const SI_NODES = ["BEN2201", "ISL2201"];
const ALL_NODES = [...NI_NODES, ...SI_NODES];
const MAX_NODES = 6;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// WITS sidebar — NZX WITS Data page
// ---------------------------------------------------------------------------

function WITSSidebar({ onClose }: { onClose: () => void }) {
  const { state, setState, setLastRefreshed } = useDashboard();
  const cfg = TIME_RANGE_CONFIG[state.timeRange];
  const isLive = state.timeRange === "LIVE";

  // Local draft state
  const [nodes, setNodes] = useState<string[]>(state.nodes);
  const [schedule, setSchedule] = useState(state.schedule);
  const [marketType, setMarketType] = useState<MarketType>(state.marketType);
  const [autoRefresh, setAutoRefresh] = useState(state.autoRefresh);
  const [refreshInterval, setRefreshInterval] = useState(state.refreshInterval);

  // Reset draft when applied state changes from outside
  useEffect(() => {
    setNodes(state.nodes);
    setSchedule(state.schedule);
    setMarketType(state.marketType);
    setAutoRefresh(state.autoRefresh);
    setRefreshInterval(state.refreshInterval);
  }, [state]);

  // Detect unapplied changes for the yellow dot
  const hasStagedNodes = JSON.stringify(nodes) !== JSON.stringify(state.nodes);
  const hasStagedSchedule = schedule !== state.schedule;
  const hasStagedMarket = marketType !== state.marketType;
  const hasStagedRefresh =
    autoRefresh !== state.autoRefresh || refreshInterval !== state.refreshInterval;
  const hasStagedChanges =
    hasStagedNodes || hasStagedSchedule || hasStagedMarket || hasStagedRefresh;

  function toggleNode(node: string) {
    setNodes((prev) => {
      if (prev.includes(node)) {
        // Minimum 1 node
        if (prev.length === 1) return prev;
        return prev.filter((n) => n !== node);
      }
      // Maximum 6 nodes
      if (prev.length >= MAX_NODES) return prev;
      return [...prev, node];
    });
  }

  function handleScheduleChange(s: string) {
    setSchedule(s);
    // Auto-fix marketType if needed
    setMarketType((mt) => sanitiseOnScheduleChange(s, mt));
  }

  function handleApply() {
    setState({ nodes, schedule, marketType, autoRefresh, refreshInterval });
    setLastRefreshed(new Date());
    onClose();
  }

  // Market type guard: RESERVES disabled when...
  const reservesDisabled =
    state.timeRange === "LIVE" ||
    state.timeRange === "1H" ||
    state.timeRange === "7D" ||
    state.timeRange === "CUSTOM" ||
    !SCHEDULE_CONFIG[schedule as keyof typeof SCHEDULE_CONFIG]?.supportsReserves;

  const scheduleOptions = cfg.scheduleOverrideable
    ? (SCHEDULES_BY_TIME_RANGE[state.timeRange] ?? [])
    : [];

  const scheduleDescription =
    SCHEDULE_CONFIG[schedule as keyof typeof SCHEDULE_CONFIG]?.description ?? "";

  return (
    <>
      {/* NODES */}
      <section>
        <p className="text-[10px] tracking-widest uppercase text-[#505050] mb-2">
          Nodes
        </p>
        {/* NI */}
        <p className="text-[9px] tracking-widest uppercase text-[#2A2A2A] mb-1 mt-2">
          North Island
        </p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {NI_NODES.map((node) => {
            const selected = nodes.includes(node);
            const disabled = !selected && nodes.length >= MAX_NODES;
            return (
              <button
                key={node}
                disabled={disabled}
                onClick={() => toggleNode(node)}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-mono rounded border transition-colors",
                  selected
                    ? "bg-[#1A1A1A] border-[#E31937] text-white"
                    : disabled
                      ? "bg-[#0A0A0A] border-[#1A1A1A] text-[#303030] cursor-not-allowed"
                      : "bg-[#1A1A1A] border-[#2A2A2A] text-[#505050] hover:text-[#A0A0A0]",
                )}
              >
                {node}
              </button>
            );
          })}
        </div>
        {/* SI */}
        <p className="text-[9px] tracking-widest uppercase text-[#2A2A2A] mb-1">
          South Island
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SI_NODES.map((node) => {
            const selected = nodes.includes(node);
            const disabled = !selected && nodes.length >= MAX_NODES;
            return (
              <button
                key={node}
                disabled={disabled}
                onClick={() => toggleNode(node)}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-mono rounded border transition-colors",
                  selected
                    ? "bg-[#1A1A1A] border-[#E31937] text-white"
                    : disabled
                      ? "bg-[#0A0A0A] border-[#1A1A1A] text-[#303030] cursor-not-allowed"
                      : "bg-[#1A1A1A] border-[#2A2A2A] text-[#505050] hover:text-[#A0A0A0]",
                )}
              >
                {node}
              </button>
            );
          })}
        </div>
        <p className="text-[9px] text-[#505050] mt-2">
          {nodes.length}/{MAX_NODES} selected · Overlay uses {nodes[0]}
        </p>
      </section>

      {/* SCHEDULE */}
      <section>
        <div className="flex items-center gap-1.5 mb-2">
          <p className="text-[10px] tracking-widest uppercase text-[#505050]">
            Schedule
          </p>
          {!cfg.scheduleOverrideable && (
            <Lock size={10} className="text-[#505050] opacity-50" />
          )}
        </div>
        {cfg.scheduleOverrideable ? (
          <>
            <select
              value={schedule}
              onChange={(e) => handleScheduleChange(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white text-[11px] rounded px-2 py-1.5 focus:outline-none focus:border-[#E31937] transition-colors"
            >
              {scheduleOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {scheduleDescription && (
              <p className="text-[9px] text-[#505050] mt-1">{scheduleDescription}</p>
            )}
          </>
        ) : (
          <div
            className="flex items-center gap-2 px-2 py-1.5 bg-[#0A0A0A] border border-[#1A1A1A] rounded"
            title={cfg.note ?? "Schedule is fixed for this time range"}
          >
            <span className="text-[11px] font-mono text-[#505050]">{schedule}</span>
            {cfg.note && (
              <span className="text-[9px] text-[#303030] italic truncate">{cfg.note}</span>
            )}
          </div>
        )}
      </section>

      {/* MARKET TYPE */}
      <section>
        <p className="text-[10px] tracking-widest uppercase text-[#505050] mb-2">
          Market
        </p>
        <div className="flex gap-1">
          {(["E", "R"] as MarketType[]).map((m) => {
            const isReserves = m === "R";
            const disabled = isReserves && reservesDisabled;
            return (
              <button
                key={m}
                disabled={disabled}
                onClick={() => !disabled && setMarketType(m)}
                title={
                  disabled
                    ? "Reserves not available for this time range / schedule"
                    : undefined
                }
                className={cn(
                  "flex-1 py-1 text-[11px] font-medium tracking-wider rounded transition-colors",
                  marketType === m && !disabled
                    ? "bg-[#E31937] text-white"
                    : disabled
                      ? "bg-[#0A0A0A] text-[#303030] cursor-not-allowed"
                      : "bg-[#1A1A1A] text-[#505050] hover:text-[#A0A0A0]",
                )}
              >
                {m === "E" ? "ENERGY" : "RESERVES"}
              </button>
            );
          })}
        </div>
      </section>

      {/* AUTO-REFRESH */}
      <section>
        <div
          className={cn(!isLive && "opacity-40 pointer-events-none")}
          title={!isLive ? "Auto-refresh only available in LIVE mode" : undefined}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] tracking-widest uppercase text-[#505050]">
              Auto-Refresh
            </p>
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className={cn(
                "relative inline-flex h-4 w-7 items-center rounded-full transition-colors",
                autoRefresh ? "bg-[#E31937]" : "bg-[#2A2A2A]",
              )}
              aria-label="Toggle auto-refresh"
            >
              <span
                className={cn(
                  "inline-block h-3 w-3 rounded-full bg-white transition-transform",
                  autoRefresh ? "translate-x-3.5" : "translate-x-0.5",
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
                      : "border-[#2A2A2A] text-[#505050] bg-[#1A1A1A] hover:text-[#A0A0A0]",
                  )}
                >
                  {s === 300 ? "5m" : `${s}s`}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Apply */}
      <div className="px-4 py-4 border-t border-[#2A2A2A] shrink-0 mt-auto">
        <button
          onClick={handleApply}
          className={cn(
            "w-full py-2 text-white text-[11px] font-semibold tracking-widest uppercase rounded transition-colors relative",
            hasStagedChanges
              ? "bg-[#E31937] hover:bg-[#cc1630]"
              : "bg-[#1A1A1A] hover:bg-[#2A2A2A]",
          )}
        >
          Apply
          {hasStagedChanges && (
            <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-yellow-400" />
          )}
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// COG Properties sidebar — stub
// ---------------------------------------------------------------------------

function PropertiesSidebar() {
  return (
    <>
      {/* PROPERTY */}
      <section>
        <p className="text-[10px] tracking-widest uppercase text-[#505050] mb-2">
          Property
        </p>
        <select
          disabled
          className="w-full bg-[#0A0A0A] border border-[#1A1A1A] text-[#303030] text-[11px] rounded px-2 py-1.5 cursor-not-allowed"
        >
          <option>Select property…</option>
        </select>
        <p className="text-[9px] text-[#505050] mt-1.5">Property data coming soon</p>
      </section>

      {/* DATE RANGE */}
      <section>
        <p className="text-[10px] tracking-widest uppercase text-[#505050] mb-2">
          Date Range
        </p>
        <div className="space-y-1.5">
          <div>
            <label className="text-[9px] text-[#505050] block mb-0.5">From</label>
            <input
              type="date"
              disabled
              className="w-full bg-[#0A0A0A] border border-[#1A1A1A] text-[#303030] text-[10px] rounded px-2 py-1 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-[9px] text-[#505050] block mb-0.5">To</label>
            <input
              type="date"
              disabled
              className="w-full bg-[#0A0A0A] border border-[#1A1A1A] text-[#303030] text-[10px] rounded px-2 py-1 cursor-not-allowed"
            />
          </div>
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Shell — picks the right config based on route
// ---------------------------------------------------------------------------

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const isWITS = location.pathname === "/";

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-10 bg-black/50" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-20 h-full w-64",
          "flex flex-col bg-[#111111] border-r border-[#2A2A2A]",
          "transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-[#2A2A2A] shrink-0">
          <span className="text-[11px] font-medium tracking-widest uppercase text-[#A0A0A0]">
            {isWITS ? "Filters" : "COG Properties"}
          </span>
          <button
            onClick={onClose}
            className="text-[#505050] hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable controls */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {isWITS ? (
            <WITSSidebar onClose={onClose} />
          ) : (
            <PropertiesSidebar />
          )}
        </div>
      </aside>
    </>
  );
}

// Ensure all node codes are referenced (for completeness)
void ALL_NODES;
