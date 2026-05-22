import { useProperties } from "@/context/PropertiesContext";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: "#1A1A1A" }}>
      <span className="text-[11px]" style={{ color: "#A0A0A0" }}>
        {label}
      </span>
      <span className="text-[11px] font-mono text-white">{value}</span>
    </div>
  );
}

export default function SystemStats() {
  const { property } = useProperties();

  if (!property) {
    return (
      <div className="px-4 py-4 text-[10px] font-mono" style={{ color: "#505050" }}>
        No data
      </div>
    );
  }

  const s = property.system;
  const installDate = new Date(s.install_date).toLocaleDateString("en-NZ", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="px-4 py-3 flex flex-col">
      <Row label="System Capacity" value={`${s.capacity_kw} kW`} />
      <Row label="Panel Count" value={`${s.panels} panels`} />
      <Row label="Inverters" value={`${s.inverters} × ${s.inverter_kw} kW`} />
      <Row label="Peak Output" value={`~${s.peak_output_kw} kW`} />
      <Row label="Orientation" value={s.orientation} />
      <Row label="Tilt" value={`${s.tilt_degrees}°`} />
      <Row label="Install Date" value={installDate} />
      <Row label="Performance Ratio" value={`${Math.round(s.performance_ratio * 100)}%`} />
    </div>
  );
}
