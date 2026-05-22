export interface PropertySystem {
  capacity_kw: number;
  panels: number;
  inverters: number;
  inverter_kw: number;
  peak_output_kw: number;
  annual_target_kwh: number;
  performance_ratio: number;
  orientation: string;
  tilt_degrees: number;
  install_date: string;
  daily_consumption_kwh_estimate?: number;
  consumption_profile?: string;
}

export interface PropertyContract {
  type: "PPA" | "lease" | "ownership";
  term_years: number;
  start_date: string;
  end_date: string;
  rate_per_kwh?: number;
  notes?: string;
}

export interface PropertyWeather {
  station_name: string;
  lat: number;
  lng: number;
  timezone: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  type: "school" | "commercial" | "industrial" | "residential";
  system: PropertySystem;
  contract: PropertyContract;
  weather: PropertyWeather;
  solar_ps_id?: string;
  notes?: string;
}
