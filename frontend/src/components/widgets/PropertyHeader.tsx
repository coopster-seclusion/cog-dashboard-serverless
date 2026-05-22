import { useProperties } from "@/context/PropertiesContext";
import { useSolarDevices } from "@/hooks/useSolarDevices";
import type { SolarDevice } from "@/hooks/useSolarDevices";

export default function PropertyHeader() {
  const { property, allProperties, selectedPropertyId, setSelectedPropertyId } =
    useProperties();
  const { data: devices } = useSolarDevices(property?.solar_ps_id);

  const inverters = (devices ?? []).filter((d) => d.device_type === 1 || d.device_type === 14);

  if (!property) return null;

  return (
    <div
      className="w-full px-6 py-4 flex items-center justify-between gap-6 shrink-0"
      style={{
        background: "#111111",
        borderBottom: "1px solid #2A2A2A",
      }}
    >
      {/* Left: name + address + type badge */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white leading-tight truncate">
            {property.name}
          </h1>
          <span
            className="text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded"
            style={{ background: "#003344", color: "#00BCD4" }}
          >
            {property.type}
          </span>
        </div>
        <p className="text-[11px]" style={{ color: "#A0A0A0" }}>
          {property.address}
        </p>
      </div>

      {/* Center: stat pills */}
      <div className="flex items-center gap-2 shrink-0">
        <StatPill value={`${property.system.capacity_kw} kW`} label="System" />
        <StatPill value={`${property.system.panels}`} label="Panels" />
        <StatPill
          value={`${property.system.inverters} × ${property.system.inverter_kw} kW`}
          label="Inverters"
        />
      </div>

      {/* Per-inverter status */}
      <div className="flex flex-col gap-1.5 shrink-0 px-3">
        <span className="text-[9px] tracking-widest uppercase" style={{ color: "#505050" }}>
          Inverters
        </span>
        {inverters.length === 0 ? (
          <span className="text-[11px]" style={{ color: "#505050" }}>—</span>
        ) : (
          inverters.map((inv, i) => (
            <InverterStatus key={inv.ps_key} inverter={inv} index={i + 1} />
          ))
        )}
      </div>

      {/* Right: property selector */}
      <div className="flex flex-col gap-1 shrink-0 min-w-[200px]">
        <label className="text-[9px] tracking-widest uppercase" style={{ color: "#505050" }}>
          Property
        </label>
        <select
          value={selectedPropertyId}
          onChange={(e) => setSelectedPropertyId(e.target.value)}
          className="w-full text-[11px] rounded px-2 py-1.5 focus:outline-none transition-colors"
          style={{
            background: "#1A1A1A",
            border: "1px solid #2A2A2A",
            color: "#FFFFFF",
          }}
        >
          {allProperties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

const FAULT_STATUS: Record<number, { color: string; label: string; pulse: boolean }> = {
  1: { color: "#F44336", label: "Fault",  pulse: false },
  2: { color: "#FF9800", label: "Alarm",  pulse: false },
  4: { color: "#4CAF50", label: "Normal", pulse: true  },
};

function InverterStatus({ inverter, index }: { inverter: SolarDevice; index: number }) {
  const status = inverter.fault_status != null
    ? (FAULT_STATUS[inverter.fault_status] ?? { color: "#505050", label: "Unknown", pulse: false })
    : { color: "#505050", label: "—", pulse: false };

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {status.pulse && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
            style={{ background: status.color }}
          />
        )}
        <span
          className="relative inline-flex rounded-full h-2.5 w-2.5"
          style={{ background: status.color }}
        />
      </span>
      <span className="text-[11px] font-medium" style={{ color: status.color }}>
        Inverter {index}
      </span>
    </div>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="flex flex-col px-3 py-1.5 rounded"
      style={{
        background: "#1A1A1A",
        borderLeft: "2px solid #E31937",
      }}
    >
      <span className="text-[13px] font-bold font-mono text-white tabular-nums">
        {value}
      </span>
      <span className="text-[9px] tracking-widest uppercase" style={{ color: "#505050" }}>
        {label}
      </span>
    </div>
  );
}
