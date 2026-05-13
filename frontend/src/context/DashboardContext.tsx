import { createContext, useContext, useState } from "react";

export type TimeRange = "LIVE" | "1H" | "6H" | "24H" | "7D" | "CUSTOM";
export type MarketType = "E" | "R";
export type Island = "NI" | "SI" | "BOTH";

export interface DashboardState {
  schedule: string;
  marketType: MarketType;
  nodes: string[];
  island: Island;
  timeRange: TimeRange;
  from?: string;
  to?: string;
  autoRefresh: boolean;
  refreshInterval: 30 | 60 | 300;
}

const DEFAULTS: DashboardState = {
  schedule: "RTD",
  marketType: "E",
  nodes: ["OTA2201", "HAY2201", "BEN2201"],
  island: "BOTH",
  timeRange: "LIVE",
  autoRefresh: true,
  refreshInterval: 30,
};

interface DashboardContextValue {
  state: DashboardState;
  setState: (patch: Partial<DashboardState>) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<DashboardState>(DEFAULTS);
  const setState = (patch: Partial<DashboardState>) =>
    setStateRaw((prev) => ({ ...prev, ...patch }));
  return (
    <DashboardContext.Provider value={{ state, setState }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
