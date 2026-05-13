import type { Theme } from "@nivo/core";

export const nivoTheme: Theme = {
  background: "transparent",
  text: {
    fill: "#A0A0A0",
    fontSize: 11,
    fontFamily: "Inter, sans-serif",
  },
  axis: {
    domain: { line: { stroke: "#2A2A2A", strokeWidth: 1 } },
    ticks: {
      line: { stroke: "#2A2A2A", strokeWidth: 1 },
      text: { fill: "#505050", fontSize: 11 },
    },
    legend: { text: { fill: "#A0A0A0", fontSize: 12 } },
  },
  grid: { line: { stroke: "#1E1E1E", strokeWidth: 1 } },
  legends: {
    text: { fill: "#A0A0A0", fontSize: 11 },
  },
  tooltip: {
    container: {
      background: "#1A1A1A",
      border: "1px solid #2A2A2A",
      borderRadius: "4px",
      color: "#FFFFFF",
      fontSize: 12,
      fontFamily: "Inter, sans-serif",
    },
  },
  crosshair: {
    line: { stroke: "#E31937", strokeWidth: 1, strokeOpacity: 0.5 },
  },
};

// Series colors in priority order: red accent, white, mid-grey, soft-red, dark-grey
export const CHART_COLORS = ["#E31937", "#FFFFFF", "#A0A0A0", "#FF6B6B", "#505050"] as const;
