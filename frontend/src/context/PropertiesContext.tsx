import { createContext, useContext, useState, useMemo } from "react";
import { useWeather } from "@/hooks/useWeather";
import { getPropertyById, getAllProperties } from "@/hooks/useProperty";
import type { Property } from "@/types/property";
import type { OpenMeteoResponse } from "@/hooks/useWeather";

interface PropertiesContextValue {
  selectedPropertyId: string;
  setSelectedPropertyId: (id: string) => void;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  property: Property | null;
  allProperties: Property[];
  weatherData: OpenMeteoResponse | null | undefined;
  weatherIsLoading: boolean;
  weatherIsError: boolean;
  weatherLastFetched: Date | null;
  refetchWeather: () => void;
}

const PropertiesContext = createContext<PropertiesContextValue | null>(null);

export function PropertiesProvider({ children }: { children: React.ReactNode }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState("hornby-high-school");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const property = useMemo(() => getPropertyById(selectedPropertyId), [selectedPropertyId]);
  const allProperties = useMemo(() => getAllProperties(), []);

  const {
    data: weatherData,
    isLoading: weatherIsLoading,
    isError: weatherIsError,
    refetch: refetchWeather,
    dataUpdatedAt,
  } = useWeather(property?.weather ?? null);

  const weatherLastFetched = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  return (
    <PropertiesContext.Provider
      value={{
        selectedPropertyId,
        setSelectedPropertyId,
        expandedId,
        setExpandedId,
        property: property ?? null,
        allProperties,
        weatherData,
        weatherIsLoading,
        weatherIsError,
        weatherLastFetched,
        refetchWeather,
      }}
    >
      {children}
    </PropertiesContext.Provider>
  );
}

export function useProperties() {
  const ctx = useContext(PropertiesContext);
  if (!ctx) throw new Error("useProperties must be used within PropertiesProvider");
  return ctx;
}
