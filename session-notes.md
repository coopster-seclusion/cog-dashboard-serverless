# Session Prompt — COG Properties Page
# Hornby High School Demo Property + Property JSON Schema + Weather Integration

Attach these files when sending:
- `cog-dashboard-ui-project.md`
- `src/pages/COGProperties.tsx` (current stub)
- `src/components/layout/Sidebar.tsx`
- `src/context/PropertiesContext.tsx`
- `src/lib/scheduleConfig.ts`

Do NOT touch NZX WITS Data page, backend, or any WITS API files.
Tesla dark theme applies throughout — same design tokens as the rest of the app.

---

## 1. File Structure to Create

```
frontend/src/
  data/
    properties/
      hornby-high-school.json     ← property data file
  types/
    property.ts                   ← TypeScript interface for property JSON
  hooks/
    useWeather.ts                 ← Open-Meteo API hook
    useProperty.ts                ← loads and manages property JSON
  components/
    widgets/
      PropertyHeader.tsx          ← property selector + key system stats
      SystemStats.tsx             ← capacity, panels, inverters, PPA info
      EstimatedOutput.tsx         ← current estimated kW (from GHI)
      GenerationChart.tsx         ← today's hourly estimated generation
      AnnualProgress.tsx          ← kWh YTD vs 280,000 kWh target
      WeatherNow.tsx              ← current conditions (temp/cloud/GHI)
      SolarIrradianceChart.tsx    ← today's GHI curve + clear sky reference
      WeatherForecast.tsx         ← 7-day forecast with solar potential rating
      CarbonOffset.tsx            ← CO2 avoided estimate
      PPADetails.tsx              ← PPA contract summary card
  pages/
    COGProperties.tsx             ← full page, replaces stub
```

---

## 2. Property JSON Schema + Hornby High School File

### `src/types/property.ts`

```typescript
export interface PropertySystem {
  capacity_kw: number;
  panels: number;
  inverters: number;
  inverter_kw: number;
  peak_output_kw: number;
  annual_target_kwh: number;
  performance_ratio: number;     // 0.0–1.0, e.g. 0.78
  orientation: string;           // "North", "North-East", etc.
  tilt_degrees: number;
  install_date: string;          // ISO date string
}

export interface PropertyContract {
  type: "PPA" | "lease" | "ownership";
  term_years: number;
  start_date: string;
  end_date: string;
  rate_per_kwh?: number;         // $/kWh under PPA if known
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
  notes?: string;
}
```

### `src/data/properties/hornby-high-school.json`

```json
{
  "id": "hornby-high-school",
  "name": "Hornby High School",
  "address": "180 Waterloo Road, Hornby, Christchurch 8042",
  "coordinates": {
    "lat": -43.5489,
    "lng": 172.5511
  },
  "type": "school",
  "system": {
    "capacity_kw": 203.4,
    "panels": 452,
    "inverters": 2,
    "inverter_kw": 110,
    "peak_output_kw": 203,
    "annual_target_kwh": 280000,
    "performance_ratio": 0.78,
    "orientation": "North",
    "tilt_degrees": 20,
    "install_date": "2023-01-01"
  },
  "contract": {
    "type": "PPA",
    "term_years": 25,
    "start_date": "2023-01-01",
    "end_date": "2048-01-01",
    "notes": "25-year power purchase agreement"
  },
  "weather": {
    "station_name": "Christchurch",
    "lat": -43.5321,
    "lng": 172.6362,
    "timezone": "Pacific/Auckland"
  }
}
```

---

## 3. Weather Data — Open-Meteo API (Free, No API Key)

Use Open-Meteo exclusively for weather. No API key required.

### `src/hooks/useWeather.ts`

Build a TanStack Query hook that calls two Open-Meteo endpoints:

**Current + today's hourly forecast:**
```
https://api.open-meteo.com/v1/forecast
  ?latitude={lat}
  &longitude={lng}
  &current=temperature_2m,cloud_cover,shortwave_radiation,direct_radiation,
           weather_code,wind_speed_10m
  &hourly=temperature_2m,cloud_cover,shortwave_radiation,direct_radiation,
          diffuse_radiation,sunshine_duration
  &daily=sunrise,sunset,shortwave_radiation_sum,temperature_2m_max,
         temperature_2m_min,weather_code
  &timezone=Pacific/Auckland
  &forecast_days=7
```

**Key fields to use:**
| Field | Used for |
|---|---|
| `current.temperature_2m` | Current temp (°C) |
| `current.cloud_cover` | Cloud cover % (0–100) |
| `current.shortwave_radiation` | Current GHI in W/m² |
| `current.direct_radiation` | Direct irradiance W/m² |
| `hourly.shortwave_radiation` | Today's GHI curve (chart) |
| `daily.shortwave_radiation_sum` | Daily GHI total (Wh/m²) → solar potential |
| `daily.sunrise` / `daily.sunset` | Sunrise/sunset times |
| `daily.weather_code` | WMO weather code → icon |

**Stale time:** 15 minutes. Do not set auto-refetch on this hook — button-triggered only.
The hook accepts a `{ lat, lng, timezone }` object sourced from the active property's
`weather` field, so it automatically updates when the property changes.

### Estimated Generation Formula

All generation figures are ESTIMATES derived from GHI. No inverter API exists yet.
Every widget showing generation output MUST display an "ESTIMATED" badge.

```typescript
// Core formula — apply everywhere generation output is shown
export function estimateKW(
  ghi_w_m2: number,
  system_capacity_kw: number,
  performance_ratio: number
): number {
  // GHI of 1000 W/m² = standard test condition (STC) = rated output
  return (ghi_w_m2 / 1000) * system_capacity_kw * performance_ratio;
}

// Daily kWh estimate from hourly GHI array
export function estimateDailyKWh(
  hourly_ghi: number[],          // 24 values, W/m²
  system_capacity_kw: number,
  performance_ratio: number
): number {
  return hourly_ghi.reduce((sum, ghi) => {
    return sum + estimateKW(ghi, system_capacity_kw, performance_ratio);
  }, 0); // Each hour = 1 kWh per kW of output
}

// NZ grid emission factor (NZ is ~80% renewable)
export const NZ_EMISSION_FACTOR_KG_PER_KWH = 0.098;
```

### Solar Potential Rating (for 7-day forecast)

Derive from daily GHI sum:
| GHI Sum (Wh/m²/day) | Label | Color |
|---|---|---|
| > 6000 | Excellent | `#4CAF50` green |
| 4000–6000 | Good | `#8BC34A` lime |
| 2000–4000 | Moderate | `#FF9800` orange |
| < 2000 | Poor | `#505050` muted |

---

## 4. Page Layout — COGProperties.tsx

12-column grid. Tesla dark theme. Same WidgetCard component as NZX WITS Data page.

### Row 0 — Property Header (full width, 12 cols)
`PropertyHeader.tsx`
- Left: Property name (large, white, bold) + address (small, `#A0A0A0`) +
  property type badge (e.g., "SCHOOL" in cyan)
- Center: Three inline stat pills:
  `203.4 kW SYSTEM` | `452 PANELS` | `2 × 110kW INVERTERS`
  Style: dark pill, Tesla red left border accent, Inter Mono for numbers
- Right: Property selector dropdown (reads all JSON files from `data/properties/`)
  Only one property currently — but selector must be built and functional.
- Background: `#111111`, bottom border `1px solid #2A2A2A`
- This is NOT a WidgetCard — it's a full-width header bar below the TopBar

### Row 1 — Current Status Strip (4 equal cards, 3 cols each)

**EstimatedOutput.tsx** (col 1–3):
- Large Inter Mono number: current estimated kW output
- Below: "of 203 kW peak capacity"
- Progress bar: current output / peak (Tesla red fill)
- "ESTIMATED" badge — small, amber `#FF9800`, always visible
- Source: `estimateKW(current.shortwave_radiation, 203.4, 0.78)`
- If GHI = 0 (night): show "0.0 kW — Outside generation hours"

**WeatherNow.tsx** (col 4–6):
- Current temp: large number + °C
- Cloud cover: percentage + horizontal fill bar
  (0% = full green, 50% = amber, 100% = dark muted)
- GHI: current W/m² value + label "Solar Irradiance"
- Sunrise / Sunset times in cyan below

**AnnualProgress.tsx** (col 7–9):
- Title "Annual Generation Target"
- Target: 280,000 kWh
- Estimated YTD: calculate using `daily.shortwave_radiation_sum` from
  Open-Meteo historical if available, otherwise use day-of-year proportion:
  `(dayOfYear / 365) × 280000` as a simple baseline
- Progress bar: YTD / 280,000 (Tesla red fill)
- Status label: "ON TRACK" (green) / "AHEAD" (cyan) / "BEHIND" (amber)
  based on ±10% of proportional target

**CarbonOffset.tsx** (col 10–12):
- Title "Est. CO₂ Avoided"
- Annual estimate: `280000 × 0.098 = 27,440 kg = 27.4 t CO₂e`
- YTD estimate: proportional
- Display: large number in tonnes, secondary in kg
- Small note: "Based on NZ grid avg 0.098 kgCO₂e/kWh"

### Row 2 — Generation Chart + Solar Irradiance (split)

**GenerationChart.tsx** (col 1–7):
- Title "Today's Estimated Generation"
- Nivo line chart — hourly estimated kW output for today (0–24h)
- X-axis: hour labels (06:00 to 20:00, hide night hours)
- Y-axis: kW (0 to 203)
- Tesla red fill area under curve
- Vertical dashed line at current hour
- "ESTIMATED" badge in card header
- Shade the area before sunrise and after sunset with `#1A1A1A` overlay
- Source: `hourly.shortwave_radiation` × formula for each hour today

**SolarIrradianceChart.tsx** (col 8–12):
- Title "Solar Irradiance — Today"
- Two lines: actual GHI (Tesla red) + clear sky reference (white, dashed)
  Note: Open-Meteo doesn't provide clear sky directly in the free tier.
  Use a simple clear sky model: bell curve peaking at solar noon.
  Solar noon for Christchurch ≈ 12:45 NZST.
  Clear sky peak ≈ 900 W/m² in summer, 500 W/m² in winter.
  Use `daily.sunshine_duration` / daylight_hours to scale the clear sky curve.
- X-axis: hours
- Y-axis: W/m² (0 to 1000)
- Cloud cover % as a secondary area chart (right Y-axis, inverted — high cloud = low fill)
  Color: `#2A2A2A` filled area, `#505050` stroke

### Row 3 — System Details + PPA + 7-Day Forecast

**SystemStats.tsx** (col 1–4):
- Title "System Specifications"
- Stat grid (label + value pairs):
  - System Capacity: 203.4 kW
  - Panel Count: 452 panels
  - Inverters: 2 × 110 kW
  - Peak Output: ~203 kW
  - Orientation: North
  - Tilt: 20°
  - Install Date: Jan 2023
  - Performance Ratio: 78%
- Labels: `#A0A0A0`, Values: white Inter Mono
- No chart — purely informational

**PPADetails.tsx** (col 5–7):
- Title "Power Purchase Agreement"
- Stat grid:
  - Contract Type: PPA
  - Term: 25 Years
  - Start: Jan 2023
  - End: Jan 2048
  - Years Remaining: calculate from today
  - Years Elapsed: calculate from today
- Progress bar: years elapsed / 25 (Tesla red fill)
- Note: "Contract details are indicative only"

**WeatherForecast.tsx** (col 8–12):
- Title "7-Day Solar Forecast"
- 7 columns (one per day), each showing:
  - Day label (Mon, Tue, etc.)
  - WMO weather code → icon (sun / cloud / rain — use simple emoji or SVG icon)
  - Max temp
  - Solar potential label + color (Excellent/Good/Moderate/Poor from table above)
  - Small bar showing daily GHI as % of max possible
- Source: `daily` arrays from Open-Meteo

---

## 5. COG Properties Sidebar

The sidebar for this page is minimal. Read the active route and render this config:

### PROPERTY section
- Dropdown of available properties (reads from `data/properties/` directory)
- Currently only one option: "Hornby High School"
- Selecting a new property updates `PropertiesContext` and triggers weather refetch
- Label shows address below dropdown in `#A0A0A0`

### WEATHER section
- Manual refresh button: "Refresh Weather Data"
- Last updated timestamp below button
- No auto-refresh toggle (weather updates every 15 min max)

No Apply button needed — property selection takes effect immediately.

---

## 6. PropertiesContext Updates

```typescript
interface PropertiesState {
  selectedPropertyId: string;             // "hornby-high-school"
  property: Property | null;             // loaded JSON
  weatherData: OpenMeteoResponse | null; // cached weather response
  weatherLastFetched: Date | null;
}
```

When `selectedPropertyId` changes:
1. Load the corresponding JSON from `data/properties/{id}.json`
2. Update `property` in state
3. Trigger `useWeather` refetch with new coordinates

---

## 7. "ESTIMATED" Badge Component

Build a reusable `EstimatedBadge.tsx`:
```
Small pill, top-right of card header or inline next to a value
Background: #1A1A00, border: 1px solid #FF9800, text: #FF9800
Text: "ESTIMATED" — uppercase, 10px, Inter, letter-spacing wide
Tooltip on hover: "Generated output is estimated from solar irradiance data.
No inverter telemetry is currently connected."
```

Apply this to every widget showing generation or yield figures:
EstimatedOutput, GenerationChart, AnnualProgress, CarbonOffset.

---

## 8. Implementation Order

1. Create `src/types/property.ts`
2. Create `src/data/properties/hornby-high-school.json`
3. Create `src/hooks/useProperty.ts` — loads JSON by ID
4. Create `src/hooks/useWeather.ts` — Open-Meteo fetch with TanStack Query
5. Update `PropertiesContext.tsx` with full state shape
6. Build `EstimatedBadge.tsx` component
7. Build `PropertyHeader.tsx` — property selector + system stat pills
8. Build Row 1 widgets: `EstimatedOutput`, `WeatherNow`, `AnnualProgress`, `CarbonOffset`
9. Build Row 2 widgets: `GenerationChart`, `SolarIrradianceChart`
10. Build Row 3 widgets: `SystemStats`, `PPADetails`, `WeatherForecast`
11. Update `Sidebar.tsx` — add COG Properties sidebar config
12. Assemble `COGProperties.tsx` page with full grid layout
13. Verify Open-Meteo is returning real data for Christchurch before marking done
14. Confirm "ESTIMATED" badge appears on all generation widgets

Confirm each step before moving to the next.
Do not touch NZX WITS Data page or any backend files.