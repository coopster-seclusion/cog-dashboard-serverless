import { createContext, useContext, useState, useCallback } from "react";
import { TIME_RANGE_CONFIG, type TimeRange } from "@/lib/timeRangeConfig";
import { SCHEDULES_BY_TIME_RANGE, sanitiseOnScheduleChange } from "@/lib/scheduleConfig";

export type MarketType = "E" | "R";
export type Island = "NI" | "SI" | "BOTH";

export interface WITSState {
  timeRange: TimeRange;
  schedule: string;
  marketType: MarketType;
  nodes: string[];
  island: Island;
  autoRefresh: boolean;
  refreshInterval: 30 | 60 | 300;
  customFrom?: string;
  customTo?: string;
}

const DEFAULTS: WITSState = {
  timeRange: "LIVE",
  schedule: "RTD",
  marketType: "E",
  nodes: ["OTA2201", "HAY2201", "BEN2201"],
  island: "BOTH",
  autoRefresh: true,
  refreshInterval: 30,
};

function deriveScheduleForTimeRange(
  newRange: TimeRange,
  currentSchedule: string,
): string {
  const cfg = TIME_RANGE_CONFIG[newRange];
  if (!cfg.scheduleOverrideable) {
    return cfg.schedule;
  }
  // Keep current schedule only if it's compatible with the new time range
  const compatible = SCHEDULES_BY_TIME_RANGE[newRange] ?? [];
  return compatible.includes(currentSchedule) ? currentSchedule : cfg.schedule;
}

interface WITSContextValue {
  state: WITSState;
  // Immediate update (TopBar time range, custom dates)
  setState: (patch: Partial<WITSState>) => void;
  // Staged sidebar changes
  staged: Partial<WITSState>;
  hasStagedChanges: boolean;
  stage: (patch: Partial<WITSState>) => void;
  applyStaged: () => void;
  // Manual refresh tracking
  lastRefreshed: Date;
  setLastRefreshed: (d: Date) => void;
}

const WITSContext = createContext<WITSContextValue | null>(null);

export function WITSProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<WITSState>(DEFAULTS);
  const [staged, setStagedRaw] = useState<Partial<WITSState>>({});
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const setState = useCallback((patch: Partial<WITSState>) => {
    setStateRaw((prev) => {
      const next = { ...prev, ...patch };

      // When timeRange changes, derive schedule + autoRefresh automatically
      if (patch.timeRange && patch.timeRange !== prev.timeRange) {
        const cfg = TIME_RANGE_CONFIG[patch.timeRange];
        next.schedule = deriveScheduleForTimeRange(patch.timeRange, prev.schedule);
        next.marketType = sanitiseOnScheduleChange(next.schedule, prev.marketType);
        next.autoRefresh = cfg.autoRefresh;
      }

      // When schedule changes directly, sanitise marketType
      if (patch.schedule && patch.schedule !== prev.schedule) {
        next.marketType = sanitiseOnScheduleChange(patch.schedule, prev.marketType);
      }

      return next;
    });
  }, []);

  const stage = useCallback((patch: Partial<WITSState>) => {
    setStagedRaw((prev) => ({ ...prev, ...patch }));
  }, []);

  const applyStaged = useCallback(() => {
    setStateRaw((prev) => {
      const next = { ...prev, ...staged };
      // Re-sanitise after merge
      next.marketType = sanitiseOnScheduleChange(next.schedule, next.marketType);
      return next;
    });
    setStagedRaw({});
    setLastRefreshed(new Date());
  }, [staged]);

  const hasStagedChanges = Object.keys(staged).length > 0;

  return (
    <WITSContext.Provider
      value={{
        state,
        setState,
        staged,
        hasStagedChanges,
        stage,
        applyStaged,
        lastRefreshed,
        setLastRefreshed,
      }}
    >
      {children}
    </WITSContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(WITSContext);
  if (!ctx) throw new Error("useDashboard must be used within WITSProvider");
  return ctx;
}

// Re-export DashboardState alias for hook compatibility
export type DashboardState = WITSState;
