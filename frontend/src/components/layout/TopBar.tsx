import { useEffect, useState, useCallback } from "react";
import { Menu, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

// Returns current NZT trading period number and HH:MM
function getNZTPInfo(): { tp: number; time: string } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const tp = Math.floor((hour * 60 + minute) / 30) + 1;
  const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return { tp, time };
}

function formatElapsed(ms: number): string {
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return rem > 0 ? `${mins}m ${rem}s ago` : `${mins}m ago`;
}

interface TopBarProps {
  onMenuToggle: () => void;
}

export default function TopBar({ onMenuToggle }: TopBarProps) {
  const queryClient = useQueryClient();
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date());

  const [tpInfo, setTPInfo] = useState(getNZTPInfo);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTPInfo(getNZTPInfo());
      setElapsed(Date.now() - lastRefreshed.getTime());
    }, 1000);
    return () => clearInterval(id);
  }, [lastRefreshed]);

  // Reset elapsed whenever any query auto-refreshes successfully
  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === "updated" &&
        (event.action as { type: string } | undefined)?.type === "success"
      ) {
        setLastRefreshed(new Date());
      }
    });
  }, [queryClient]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries();
    setLastRefreshed(new Date());
  }, [queryClient]);

  return (
    <header className="flex flex-col shrink-0 bg-[#111111] border-b border-[#2A2A2A]">
      <div className="flex items-center h-12 px-4 gap-4">
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

        {/* Right — TP info + elapsed + refresh */}
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-[11px] font-mono text-[#505050] whitespace-nowrap">
            TP {tpInfo.tp} · {tpInfo.time}
          </span>
          <span className="text-[10px] font-mono text-[#505050] whitespace-nowrap">
            Updated {formatElapsed(elapsed)}
          </span>

          <button
            onClick={handleRefresh}
            className="text-[#505050] hover:text-[#A0A0A0] transition-colors"
            aria-label="Refresh data"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
