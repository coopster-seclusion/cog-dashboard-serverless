import { RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProperties } from "@/context/PropertiesContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// COG Properties sidebar
// ---------------------------------------------------------------------------

function PropertiesSidebar() {
  const {
    allProperties,
    selectedPropertyId,
    setSelectedPropertyId,
    property,
    weatherIsLoading,
    weatherLastFetched,
    refetchWeather,
  } = useProperties();

  return (
    <>
      {/* PROPERTY */}
      <section>
        <p className="text-[10px] tracking-widest uppercase text-[#505050] mb-2">
          Property
        </p>
        <select
          value={selectedPropertyId}
          onChange={(e) => setSelectedPropertyId(e.target.value)}
          className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white text-[11px] rounded px-2 py-1.5 focus:outline-none focus:border-[#E31937] transition-colors"
        >
          {allProperties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {property && (
          <p className="text-[9px] text-[#505050] mt-1.5 truncate">{property.address}</p>
        )}
      </section>

      {/* WEATHER */}
      <section>
        <p className="text-[10px] tracking-widest uppercase text-[#505050] mb-2">
          Weather
        </p>
        <button
          onClick={() => refetchWeather()}
          disabled={weatherIsLoading}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-1.5 text-[11px] font-medium rounded border transition-colors",
            weatherIsLoading
              ? "bg-[#0A0A0A] border-[#1A1A1A] text-[#303030] cursor-not-allowed"
              : "bg-[#1A1A1A] border-[#2A2A2A] text-[#A0A0A0] hover:border-[#E31937] hover:text-white",
          )}
        >
          <RefreshCw
            size={11}
            className={weatherIsLoading ? "animate-spin" : ""}
          />
          Refresh Weather Data
        </button>
        {weatherLastFetched && (
          <p className="text-[9px] text-[#505050] mt-1.5">
            Updated{" "}
            {weatherLastFetched.toLocaleTimeString("en-NZ", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-10 bg-black/50" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-20 h-full w-64",
          "flex flex-col bg-[#111111] border-r border-[#2A2A2A]",
          "transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-[#2A2A2A] shrink-0">
          <span className="text-[11px] font-medium tracking-widest uppercase text-[#A0A0A0]">
            COG Properties
          </span>
          <button
            onClick={onClose}
            className="text-[#505050] hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable controls */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          <PropertiesSidebar />
        </div>
      </aside>
    </>
  );
}
