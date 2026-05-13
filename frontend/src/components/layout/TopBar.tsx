import { Menu, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard, type TimeRange } from "@/context/DashboardContext";

const TIME_RANGES: TimeRange[] = ["LIVE", "1H", "6H", "24H", "7D", "CUSTOM"];

interface TopBarProps {
  onMenuToggle: () => void;
}

export default function TopBar({ onMenuToggle }: TopBarProps) {
  const { state, setState } = useDashboard();
  const isLive = state.timeRange === "LIVE";

  return (
    <header className="flex items-center h-12 shrink-0 bg-[#111111] border-b border-[#2A2A2A] px-4 gap-4">
      {/* Left — hamburger + wordmark */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="text-[#A0A0A0] hover:text-white transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-2">
          <span className="w-0.5 h-4 bg-[#E31937] shrink-0" />
          <span className="text-[11px] font-semibold tracking-[0.2em] text-white uppercase whitespace-nowrap">
            COG Dashboard
          </span>
        </div>
      </div>

      {/* Center — time range strip */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-0.5">
          {TIME_RANGES.map((range) => (
            <button
              key={range}
              onClick={() => setState({ timeRange: range })}
              className={cn(
                "px-3 py-1 text-[11px] font-medium tracking-wider rounded transition-colors",
                state.timeRange === range
                  ? "bg-[#E31937] text-white"
                  : "text-[#505050] hover:text-[#A0A0A0]"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Right — live dot + refresh */}
      <div className="flex items-center gap-3">
        {isLive && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E31937] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E31937]" />
            </span>
            <span className="text-[11px] font-semibold tracking-widest text-[#E31937]">
              LIVE
            </span>
          </div>
        )}
        <button
          className="text-[#505050] hover:text-[#A0A0A0] transition-colors"
          aria-label="Refresh data"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </header>
  );
}
