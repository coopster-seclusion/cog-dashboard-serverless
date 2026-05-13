export default function EstimatedBadge() {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-medium tracking-widest uppercase rounded border cursor-default"
      style={{
        background: "#1A1A00",
        border: "1px solid #FF9800",
        color: "#FF9800",
        letterSpacing: "0.12em",
      }}
      title="Generated output is estimated from solar irradiance data. No inverter telemetry is currently connected."
    >
      Estimated
    </span>
  );
}
