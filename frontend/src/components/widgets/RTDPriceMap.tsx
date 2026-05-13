import { usePrices } from "@/hooks/useWITS";
import { WidgetSkeleton } from "@/components/layout/WidgetCard";

// Pre-mapped pixel positions in the SVG coordinate space (viewBox 0 0 420 500)
const NODE_POSITIONS: Record<string, [number, number]> = {
  OTA2201: [185, 148],
  MRT2201: [188, 155],
  WKM2201: [165, 188],
  TAU2201: [185, 195],
  STK0111: [143, 205],
  HAY2201: [200, 268],
  ISL2201: [170, 355],
  BEN2201: [178, 390],
};

// Label positions on the right side — kept clear of the island outline
const LABEL_X = 255;
const LABEL_POSITIONS: Record<string, number> = {
  OTA2201: 136,
  MRT2201: 153,
  WKM2201: 180,
  TAU2201: 197,
  STK0111: 215,
  HAY2201: 265,
  ISL2201: 348,
  BEN2201: 385,
};

// Simplified NZ outlines (viewBox 0 0 420 500)
// North Island — clockwise from Northland tip
const NI_PATH =
  "M 183 82 L 193 95 L 200 112 L 203 130 L 202 148 " +
  "L 208 160 L 215 172 L 218 185 L 216 200 " +
  "L 218 215 L 215 232 L 218 248 L 215 262 " +
  "L 208 272 L 200 268 " +
  "L 190 278 L 178 285 L 165 280 " +
  "L 155 268 L 150 252 L 148 238 " +
  "L 142 222 L 135 208 " +
  "L 138 195 L 143 185 L 148 175 " +
  "L 150 162 L 155 150 " +
  "L 160 140 L 162 130 L 165 118 L 170 102 L 175 90 Z";

// South Island — clockwise from Farewell Spit (top-left)
const SI_PATH =
  "M 158 308 L 175 305 L 193 308 L 208 318 " +
  "L 218 332 L 224 348 L 222 365 L 218 382 " +
  "L 212 398 L 205 415 L 196 430 L 183 440 " +
  "L 168 438 L 155 428 L 142 415 " +
  "L 132 400 L 125 385 L 122 368 " +
  "L 125 352 L 130 338 L 138 325 L 148 315 Z";

const MAP_NODES = Object.keys(NODE_POSITIONS);

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full px-4 text-[10px] font-mono text-[#E31937]">
      {message}
    </div>
  );
}

export default function RTDPriceMap() {
  const { data, isLoading, error } = usePrices({
    schedule: "RTD",
    marketType: "E",
    nodes: MAP_NODES.join(","),
    back: 1,
  });

  if (isLoading) return <WidgetSkeleton height={400} />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data) return null;

  // Get the latest price for each node
  const nodePrices: Record<string, { price: number | null; tp: number | null }> = {};
  let latestTP: number | null = null;
  let latestTime = "";

  for (const [nodeId, nodeData] of Object.entries(data.nodes)) {
    const pairs = nodeData.timestamps
      .map((ts, i) => ({ ts, price: nodeData.prices[i] }))
      .filter((p) => p.ts != null)
      .sort((a, b) => new Date(a.ts!).getTime() - new Date(b.ts!).getTime());

    const latest = pairs.at(-1);
    if (latest?.ts) {
      const fmt = new Intl.DateTimeFormat("en-NZ", {
        timeZone: "Pacific/Auckland",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const parts = fmt.formatToParts(new Date(latest.ts));
      const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
      const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
      const tp = Math.floor((hour * 60 + minute) / 30) + 1;
      if (latestTP == null) {
        latestTP = tp;
        latestTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      }
      nodePrices[nodeId] = { price: latest.price, tp };
    } else {
      nodePrices[nodeId] = { price: null, tp: null };
    }
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* TP label */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <span className="text-[10px] text-[#505050]">RTD node prices · $/MWh</span>
        {latestTP != null && (
          <span className="text-[10px] font-mono text-[#00BCD4]">
            TP{latestTP} · {latestTime}
          </span>
        )}
      </div>

      {/* SVG map — scales to fill remaining space */}
      <div className="flex-1 min-h-0 px-2 pb-2">
        <svg
          viewBox="0 0 420 500"
          className="w-full h-full"
          style={{ maxHeight: "420px" }}
          aria-label="New Zealand RTD price map"
        >
          {/* Background */}
          <rect width="420" height="500" fill="#1A1A1A" />

          {/* NZ land */}
          <path d={NI_PATH} fill="#2A2A2A" stroke="#3A3A3A" strokeWidth="0.5" />
          <path d={SI_PATH} fill="#2A2A2A" stroke="#3A3A3A" strokeWidth="0.5" />

          {/* Divider line between map and label area */}
          <line
            x1="242"
            y1="80"
            x2="242"
            y2="460"
            stroke="#2A2A2A"
            strokeWidth="0.5"
            strokeDasharray="3 4"
          />

          {/* Node dots + labels */}
          {MAP_NODES.map((nodeId) => {
            const pos = NODE_POSITIONS[nodeId];
            const labelY = LABEL_POSITIONS[nodeId];
            const priceInfo = nodePrices[nodeId];
            const price = priceInfo?.price;
            const labelText =
              price != null
                ? `${nodeId} · $${price.toFixed(2)}`
                : `${nodeId} · —`;

            const dotX = pos[0];
            const dotY = pos[1];
            const lineEndX = LABEL_X - 2;
            const chipX = LABEL_X;
            const chipW = 128;
            const chipH = 14;
            const chipY = labelY - chipH / 2;

            return (
              <g key={nodeId}>
                {/* Connecting line: dot → label chip */}
                <line
                  x1={dotX}
                  y1={dotY}
                  x2={lineEndX}
                  y2={labelY}
                  stroke="#E31937"
                  strokeWidth="0.75"
                  strokeOpacity="0.4"
                />

                {/* Node dot */}
                <circle
                  cx={dotX}
                  cy={dotY}
                  r="4"
                  fill="#E31937"
                  fillOpacity="0.9"
                />

                {/* Label chip background */}
                <rect
                  x={chipX}
                  y={chipY}
                  width={chipW}
                  height={chipH}
                  fill="#111111"
                  stroke="#E31937"
                  strokeWidth="0.75"
                  rx="2"
                />

                {/* Label text */}
                <text
                  x={chipX + 4}
                  y={labelY + 4}
                  fill="white"
                  fontSize="8.5"
                  fontFamily="'Roboto Mono', 'Courier New', monospace"
                >
                  {labelText}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
