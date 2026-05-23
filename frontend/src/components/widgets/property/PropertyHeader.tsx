import type { Property } from "@/types/property";
import { useSolarDevices } from "@/hooks/useSolarDevices";
import { useSolarRealtime } from "@/hooks/useSolarRealtime";
import type { SolarDevice } from "@/hooks/useSolarDevices";

interface Props {
  property: Property;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function PropertyHeader({ property, isExpanded, onToggle }: Props) {
  const { data: devices } = useSolarDevices(property.solar_ps_id);
  const { data: realtime, dataUpdatedAt } = useSolarRealtime(property.solar_ps_id);

  const inverters = (devices ?? []).filter((d) => d.device_type === 1 || d.device_type === 14);

  const powerKw  = typeof realtime?.power?.value === "number"
    ? (realtime.power.value / 1000).toFixed(1)
    : null;
  const yieldKwh = typeof realtime?.daily_yield?.value === "number"
    ? (realtime.daily_yield.value / 1000).toFixed(1)
    : null;

  return (
    <div
      className="w-full px-6 py-4 grid items-center shrink-0 cursor-pointer select-none transition-colors"
      style={{
        gridTemplateColumns: "1fr auto 1fr",
        background: isExpanded ? "#161616" : "#111111",
        borderBottom: "1px solid #2A2A2A",
        borderLeft: isExpanded ? "3px solid #E31937" : "3px solid transparent",
      }}
      onClick={onToggle}
    >
      {/* Left: Name + address + type badge */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-white leading-tight truncate">
            {property.name}
          </h2>
          <span
            className="text-[11px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded shrink-0"
            style={{ background: "#003344", color: "#00BCD4" }}
          >
            {property.type}
          </span>
        </div>
        <p className="text-[13px] truncate" style={{ color: "#606060" }}>
          {property.address}
        </p>
      </div>

      {/* Center: Stat pills — truly centered across full header width */}
      <div className="flex items-center gap-2 px-8">
        <StatPill value={`${property.system.capacity_kw} kW`} label="System" />
        <StatPill value={`${property.system.panels}`}         label="Panels" />
        <StatPill
          value={`${property.system.inverters} × ${property.system.inverter_kw} kW`}
          label="Inverters"
        />
      </div>

      {/* Right: Last updated + inverter status + live stats + chevron */}
      <div className="flex items-center gap-4 justify-self-end">
        {/* Fixed-width block keeps live stats aligned across all headers */}
        <div className="flex items-center gap-3 justify-end shrink-0" style={{ width: 176 }}>
          <LastUpdated timestamp={dataUpdatedAt} />
          {inverters.length > 0 && (
            <div className="flex flex-col gap-1 shrink-0">
              {inverters.map((inv, i) => (
                <InverterStatus key={inv.ps_key} inverter={inv} index={i + 1} />
              ))}
            </div>
          )}
        </div>

        <LiveStat
          value={powerKw !== null ? `${powerKw} kW` : "—"}
          label="Now"
          highlight={powerKw !== null && parseFloat(powerKw) > 0}
        />
        <LiveStat
          value={yieldKwh !== null ? `${yieldKwh} kWh` : "—"}
          label="Today"
        />

        <div
          className="shrink-0 ml-2 transition-transform duration-200"
          style={{
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            color: "#505050",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const FAULT_STATUS: Record<number, { color: string; pulse: boolean }> = {
  1: { color: "#F44336", pulse: false },
  2: { color: "#FF9800", pulse: false },
  4: { color: "#4CAF50", pulse: true  },
};

function InverterStatus({ inverter, index }: { inverter: SolarDevice; index: number }) {
  const status = inverter.fault_status != null
    ? (FAULT_STATUS[inverter.fault_status] ?? { color: "#505050", pulse: false })
    : { color: "#505050", pulse: false };

  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2 shrink-0">
        {status.pulse && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
            style={{ background: status.color }}
          />
        )}
        <span
          className="relative inline-flex rounded-full h-2 w-2"
          style={{ background: status.color }}
        />
      </span>
      <span className="text-[12px]" style={{ color: "#808080" }}>
        Inverter {index}
      </span>
    </div>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="flex flex-col px-3 py-1.5 rounded"
      style={{ background: "#1A1A1A", borderLeft: "2px solid #E31937" }}
    >
      <span className="text-[14px] font-bold font-mono text-white tabular-nums">{value}</span>
      <span className="text-[11px] tracking-widest uppercase" style={{ color: "#505050" }}>{label}</span>
    </div>
  );
}

function LastUpdated({ timestamp }: { timestamp: number }) {
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "—";
  return (
    <div className="flex flex-col items-end shrink-0">
      <span className="text-[13px] font-mono tabular-nums" style={{ color: "#606060" }}>{time}</span>
      <span className="text-[11px] tracking-widest uppercase" style={{ color: "#404040" }}>Updated</span>
    </div>
  );
}

function LiveStat({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-end shrink-0" style={{ minWidth: 72 }}>
      <span
        className="text-[16px] font-bold font-mono tabular-nums"
        style={{ color: highlight ? "#4CAF50" : "#C0C0C0" }}
      >
        {value}
      </span>
      <span className="text-[11px] tracking-widest uppercase" style={{ color: "#505050" }}>
        {label}
      </span>
    </div>
  );
}
