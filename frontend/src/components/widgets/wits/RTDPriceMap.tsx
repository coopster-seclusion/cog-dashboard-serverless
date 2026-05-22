import { usePrices } from "@/hooks/useWITS";
import { NODE_COLOR_MAP } from "@/lib/nivoTheme";
import { WidgetSkeleton } from "@/components/layout/WidgetCard";
import { geoMercator, geoPath } from "d3-geo";
import nzGeoJson from "./new-zealand.json";

// 5 working RTD nodes
const NODE_COORDINATES: Record<string, [number, number]> = {
  OTA2201: [174.85, -36.95], // Auckland
  WKM2201: [175.80, -38.42], // Waikato
  HAY2201: [174.98, -41.15], // Wellington
  ISL2201: [172.49, -43.54], // Christchurch
  BEN2201: [170.19, -44.57], // Benmore
};


const MAP_NODES = Object.keys(NODE_COORDINATES);

// SVG canvas
const W = 265;
const H = 310;

// Projection: NZ shifted left so the right strip is free for labels.
// translate=[80,155] keeps the landmass in x≈15–160, y≈45–255.
const projection = geoMercator()
  .center([173, -41])
  .scale(700)
  .translate([80, 155]);

const pathGenerator = geoPath().projection(projection);

// Two-line label chips, all on the right column.
// Chip left edge starts at CHIP_X; leader line runs from chip-left to the dot.
// y positions are tuned so each chip centre aligns with the corresponding dot y:
//   OTA dot ≈ (103,  91) → chip centre at y=78+13=91
//   WKM dot ≈ (114, 114) → chip centre at y=101+13=114
//   HAY dot ≈ (104, 158) → chip centre at y=145+13=158
//   ISL dot ≈ ( 74, 195) → chip centre at y=182+13=195
//   BEN dot ≈ ( 46, 219) → chip centre at y=206+13=219
const CHIP_X = 175;
const CHIP_W = 84;
const CHIP_H = 32;
const CHIP_STEP = 40; // chip height + 8px gap

const LABEL_Y: Record<string, number> = {
  OTA2201:  50,
  WKM2201:  50 + CHIP_STEP,
  HAY2201:  50 + CHIP_STEP * 2,
  ISL2201:  50 + CHIP_STEP * 3,
  BEN2201:  50 + CHIP_STEP * 4,
};

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
    back: 10,
  });

  if (isLoading) return <WidgetSkeleton height={310} />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data) return null;

  const nodePrices: Record<string, { price: number | null }> = {};
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
      const hour   = parseInt(parts.find((p) => p.type === "hour")?.value   ?? "0", 10);
      const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
      const tp = Math.floor((hour * 60 + minute) / 30) + 1;
      if (latestTP == null) {
        latestTP = tp;
        latestTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      }
      nodePrices[nodeId] = { price: latest.price };
    } else {
      nodePrices[nodeId] = { price: null };
    }
  }

  const mapPath = pathGenerator(nzGeoJson as any);

  return (
    <div className="w-full h-full flex flex-col max-h-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 shrink-0">
        <span className="text-[10px] text-[#505050]">RTD node prices · $/MWh</span>
        {latestTP != null && (
          <span className="text-[10px] font-mono text-[#00BCD4]">
            TP{latestTP} · {latestTime}
          </span>
        )}
      </div>

      {/* SVG: map left, label column right */}
      <div className="flex-1 min-h-0 px-2 pb-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full drop-shadow-md"
          aria-label="New Zealand RTD price map"
        >
          <rect width={W} height={H} fill="#161616" rx="8" />

          {mapPath && (
            <path d={mapPath} fill="#252525" stroke="#333333" strokeWidth="0.8" />
          )}

          {MAP_NODES.map((nodeId) => {
            const projected = projection(NODE_COORDINATES[nodeId]);
            if (!projected) return null;
            const [dotX, dotY] = projected;
            const color = NODE_COLOR_MAP[nodeId] ?? "#505050";
            const chipY = LABEL_Y[nodeId];
            const price = nodePrices[nodeId]?.price;

            // Leader line runs from dot to the chip's left edge, horizontally centred on the chip
            const lineEndY = chipY + CHIP_H / 2;

            return (
              <g key={nodeId}>
                {/* Leader line */}
                <line
                  x1={dotX}  y1={dotY}
                  x2={CHIP_X} y2={lineEndY}
                  stroke={color}
                  strokeWidth="0.8"
                  strokeOpacity="0.45"
                  strokeDasharray="3 2"
                />

                {/* Node dot */}
                <circle cx={dotX} cy={dotY} r="4" fill={color} fillOpacity="0.95" />

                {/* Chip background */}
                <rect
                  x={CHIP_X} y={chipY}
                  width={CHIP_W} height={CHIP_H}
                  fill="#111111"
                  stroke={color}
                  strokeWidth="0.8"
                  rx="3"
                />

                {/* Node name */}
                <text
                  x={CHIP_X + 5} y={chipY + 13}
                  fill="#888"
                  fontSize="9"
                  fontFamily="'Roboto Mono','Courier New',monospace"
                >
                  {nodeId}
                </text>

                {/* Price */}
                <text
                  x={CHIP_X + 5} y={chipY + 27}
                  fill="white"
                  fontSize="12"
                  fontWeight="700"
                  fontFamily="'Roboto Mono','Courier New',monospace"
                >
                  {price != null ? `$${price.toFixed(2)}` : "—"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
