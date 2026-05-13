// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const nivoTheme: any = {
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

// 8 visually distinct colors for dark backgrounds — Tailwind 400 palette
export const CHART_COLORS = [
  "#60A5FA", // blue-400
  "#34D399", // emerald-400
  "#FBBF24", // amber-400
  "#F472B6", // pink-400
  "#818CF8", // violet-400
  "#38BDF8", // sky-400
  "#FB923C", // orange-400
  "#A3E635", // lime-400
] as const;
