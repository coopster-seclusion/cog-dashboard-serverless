export const SCHEDULE_CONFIG = {
  RTD: {
    description: "Real-time dispatch — 30-min intervals",
    supportsReserves: false,
  },
  PRSS: {
    description: "Pre-dispatch short-run steady state — latest forecast",
    supportsReserves: true,
  },
  PRSL: {
    description: "Pre-dispatch long-run — up to 12 TPs ahead",
    supportsReserves: true,
  },
  NRSS: {
    description: "Net residual short-run steady state",
    supportsReserves: true,
  },
  NRSL: {
    description: "Net residual long-run",
    supportsReserves: true,
  },
  Interim: {
    description: "Interim prices — released within 1 day of trading",
    supportsReserves: true,
  },
  Final: {
    description: "Final prices — settled and confirmed",
    supportsReserves: false,
  },
  WDS: {
    description: "Wholesale dispatch schedule",
    supportsReserves: false,
  },
} as const;

export type ScheduleKey = keyof typeof SCHEDULE_CONFIG;

export const SCHEDULES_BY_TIME_RANGE: Record<string, string[]> = {
  "6H": ["RTD", "NRSS", "PRSS"],
  "24H": ["NRSS", "NRSL", "PRSS", "PRSL", "Interim"],
};

export function sanitiseOnScheduleChange(
  schedule: string,
  marketType: "E" | "R",
): "E" | "R" {
  const config = SCHEDULE_CONFIG[schedule as ScheduleKey];
  if (!config) return "E";
  if (marketType === "R" && !config.supportsReserves) return "E";
  return marketType;
}
