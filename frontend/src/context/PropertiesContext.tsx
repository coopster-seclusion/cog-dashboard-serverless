import { createContext, useContext, useState } from "react";

export interface PropertiesState {
  selectedProperty: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

const DEFAULTS: PropertiesState = {
  selectedProperty: null,
  dateFrom: null,
  dateTo: null,
};

interface PropertiesContextValue {
  state: PropertiesState;
  setState: (patch: Partial<PropertiesState>) => void;
}

const PropertiesContext = createContext<PropertiesContextValue | null>(null);

export function PropertiesProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<PropertiesState>(DEFAULTS);
  const setState = (patch: Partial<PropertiesState>) =>
    setStateRaw((prev) => ({ ...prev, ...patch }));
  return (
    <PropertiesContext.Provider value={{ state, setState }}>
      {children}
    </PropertiesContext.Provider>
  );
}

export function useProperties() {
  const ctx = useContext(PropertiesContext);
  if (!ctx) throw new Error("useProperties must be used within PropertiesProvider");
  return ctx;
}
