import { useProperties } from "@/context/PropertiesContext";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: "#1A1A1A" }}>
      <span className="text-[11px]" style={{ color: "#A0A0A0" }}>
        {label}
      </span>
      <span className="text-[11px] font-mono text-white text-right break-words min-w-0 ml-3">{value}</span>
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
  const formatDate = (value: string) => new Date(value).toLocaleDateString("en-NZ", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="px-4 py-3 flex flex-col">
      <Row label="System Capacity" value={`${s.capacity_kw} kW`} />
      <Row label="Panel Count" value={`${s.panels_estimated ? "~" : ""}${s.panels} panels${s.panels_estimated ? " (inferred)" : ""}`} />
      {s.panel_model && <Row label="Panel Model" value={s.panel_model} />}
      {s.panel_wattage && <Row label="Panel Rating" value={`${s.panel_wattage} W`} />}
      <Row label="Inverters" value={`${s.inverters} × ${s.inverter_kw} kW`} />
      {s.inverter_model && <Row label="Inverter Model" value={s.inverter_model} />}
      {s.inverter_serial && <Row label="Inverter Serial" value={s.inverter_serial} />}
      {s.peak_output_kw !== undefined && <Row label="Peak Output" value={`~${s.peak_output_kw} kW`} />}
      {s.orientation && <Row label="Orientation" value={s.orientation} />}
      {s.tilt_degrees !== undefined && <Row label="Tilt" value={`${s.tilt_degrees}°`} />}
      {s.install_date && <Row label="Install Date" value={formatDate(s.install_date)} />}
      {s.connection_date && <Row label="Grid Connection" value={formatDate(s.connection_date)} />}
      <Row label="Performance Ratio" value={`${s.performance_ratio_estimated ? "~" : ""}${Math.round(s.performance_ratio * 100)}%${s.performance_ratio_estimated ? " (model assumption)" : ""}`} />
    </div>
  );
}
