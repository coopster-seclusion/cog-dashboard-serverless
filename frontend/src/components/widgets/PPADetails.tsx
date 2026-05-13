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

export default function PPADetails() {
  const { property } = useProperties();

  if (!property) {
    return (
      <div className="px-4 py-4 text-[10px] font-mono" style={{ color: "#505050" }}>
        No data
      </div>
    );
  }

  const c = property.contract;
  const now = new Date();
  const startDate = new Date(c.start_date);
  const endDate = new Date(c.end_date);

  const yearsElapsed = (now.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const yearsRemaining = c.term_years - yearsElapsed;
  const pct = Math.min((yearsElapsed / c.term_years) * 100, 100);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-NZ", { month: "short", year: "numeric" });

  return (
    <div className="px-4 py-3 flex flex-col gap-3">
      <div className="flex flex-col">
        <Row label="Contract Type" value={c.type} />
        <Row label="Term" value={`${c.term_years} years`} />
        <Row label="Start" value={fmtDate(startDate)} />
        <Row label="End" value={fmtDate(endDate)} />
        <Row label="Years Elapsed" value={yearsElapsed.toFixed(1)} />
        <Row label="Years Remaining" value={yearsRemaining.toFixed(1)} />
      </div>

      <div className="flex flex-col gap-1">
        <div className="h-1.5 rounded overflow-hidden" style={{ background: "#1A1A1A" }}>
          <div
            className="h-full rounded"
            style={{ width: `${pct}%`, background: "#E31937" }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono" style={{ color: "#505050" }}>
          <span>{fmtDate(startDate)}</span>
          <span>{pct.toFixed(1)}% elapsed</span>
          <span>{fmtDate(endDate)}</span>
        </div>
      </div>

      {c.notes && (
        <p className="text-[9px] italic" style={{ color: "#303030" }}>
          {c.notes}
        </p>
      )}

      <p className="text-[9px] italic" style={{ color: "#303030" }}>
        Contract details are indicative only
      </p>
    </div>
  );
}
