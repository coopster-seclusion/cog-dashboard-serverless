# NZ Electricity Market Dashboard — FastAPI + React

A production-quality local dashboard built on top of the WITS API work from `cog-dashboard_v1`.
The Streamlit project stays alive as a backend reference and exploration tool.
This repo is the real UI.

---

## Relationship to the Streamlit Project

`cog-dashboard_v1` (Streamlit) — keep it. It's a working API sandbox and lets you validate data
fast without touching this codebase. `wits_client.py` from that project is copied here and wrapped
by FastAPI. Any new API exploration should happen in the Streamlit project first, then get promoted here.

---

## Architecture

```
Browser (React) ──► FastAPI (localhost:8001) ──► WITS API (electricityinfo.co.nz)
                                             ──► iSolarCloud API (augateway.isolarcloud.com)
```

> **Note:** Backend runs on port 8001 (not 8000) due to a persistent WSL2 proxy occupying 8000.
> Vite proxies `/api` → `http://localhost:8001`. The OAuth2 redirect URI in the iSolarCloud
> developer portal still points to port 8000 — only matters if tokens expire and re-auth is needed.

React never talks to external APIs directly. FastAPI owns all credentials, handles OAuth tokens,
and serves clean JSON. This means:

- Credentials live in a `.env` file, not a sidebar input field
- Token refresh happens server-side and is invisible to the UI
- React can poll FastAPI on a timer for live data without re-authenticating
- CORS is a non-issue because both services are on localhost

---

## Repo Structure

```
cog-dashboard-ui/
├── backend/
│   ├── main.py               # FastAPI app, lifespan, router registration
│   ├── dependencies.py       # Shared FastAPI dependencies (get_wits_client, get_isolar_client)
│   ├── routers/
│   │   ├── wits.py           # All /api/* WITS routes
│   │   └── isolar_cloud.py   # All /api/solar/* iSolarCloud routes
│   ├── services/
│   │   ├── wits_client.py    # WITS API client (OAuth2 client credentials)
│   │   └── isolar_cloud.py   # iSolarCloud API client (OAuth2 authorization code)
│   ├── models/
│   │   ├── wits.py           # Pydantic response models for WITS routes
│   │   └── isolar_cloud.py   # Pydantic response models for solar routes
│   ├── token_store.json      # Persisted iSolarCloud OAuth2 tokens (git-ignored)
│   ├── .env                  # Credentials (git-ignored)
│   ├── .env.example          # Template committed to repo
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── TopBar.tsx        # 48px top bar — hamburger, time range, live dot
│   │   │   │   ├── Sidebar.tsx       # 240px slide-in filter panel
│   │   │   │   ├── DashboardGrid.tsx # Responsive CSS grid (1→2→3 col)
│   │   │   │   └── WidgetCard.tsx    # Base card wrapper + WidgetSkeleton export
│   │   │   └── widgets/
│   │   │       ├── property/         # COG Properties page widgets
│   │   │       │   ├── PropertyHeader.tsx      # Accordion header — live kW, daily kWh, inverter lights
│   │   │       │   ├── EstimatedOutput.tsx
│   │   │       │   ├── WeatherNow.tsx
│   │   │       │   ├── AnnualProgress.tsx
│   │   │       │   ├── CarbonOffset.tsx
│   │   │       │   ├── GenerationChart.tsx
│   │   │       │   ├── SolarIrradianceChart.tsx
│   │   │       │   ├── SchoolConsumption.tsx
│   │   │       │   ├── GridExport.tsx
│   │   │       │   ├── SystemStats.tsx
│   │   │       │   ├── PPADetails.tsx
│   │   │       │   └── WeatherForecast.tsx
│   │   │       ├── wits/             # WITS / market data widgets
│   │   │       │   ├── PriceChart.tsx
│   │   │       │   ├── PriceKPIs.tsx
│   │   │       │   ├── PriceSpread.tsx
│   │   │       │   ├── ScheduleOverlay.tsx
│   │   │       │   ├── IslandBalance.tsx
│   │   │       │   ├── IntermittentShare.tsx
│   │   │       │   ├── ForwardCurve.tsx
│   │   │       │   ├── RTDPriceMap.tsx
│   │   │       │   ├── NodeTicker.tsx
│   │   │       │   ├── EnergyGeneration.tsx
│   │   │       │   ├── EnergyDemand.tsx
│   │   │       │   ├── NIReserves.tsx
│   │   │       │   ├── SIReserves.tsx
│   │   │       │   └── new-zealand.json        # GeoJSON used by RTDPriceMap
│   │   │       └── shared/           # Used across widget groups
│   │   │           └── EstimatedBadge.tsx
│   │   ├── context/
│   │   │   ├── WITSContext.tsx       # Global filter state (schedule, nodes, timeRange…)
│   │   │   └── PropertiesContext.tsx # Selected property + weather data
│   │   ├── hooks/
│   │   │   ├── useWITS.ts            # TanStack Query hooks — all read from WITSContext
│   │   │   ├── useWeather.ts         # Open-Meteo weather hook
│   │   │   ├── useProperty.ts        # Property registry lookup
│   │   │   ├── useSolarDevices.ts    # Fetch inverter/ESS device list per plant (5-min poll)
│   │   │   └── useSolarRealtime.ts   # Fetch live power + yield per plant (5-min poll)
│   │   ├── data/
│   │   │   └── properties/
│   │   │       └── hornby-high-school.json     # Property config + solar_ps_id
│   │   ├── types/
│   │   │   └── property.ts           # Property, PropertySystem, PropertyContract interfaces
│   │   ├── lib/
│   │   │   ├── api.ts        # Fetch wrappers pointing at FastAPI
│   │   │   ├── nivoTheme.ts  # Shared Nivo theme + CHART_COLORS palette
│   │   │   └── utils.ts      # cn() helper
│   │   ├── pages/
│   │   │   ├── NZXWITSData.tsx      # Full NZX WITS data page
│   │   │   ├── Prices.tsx           # Prices widget grid
│   │   │   ├── Quantities.tsx       # Quantities widget grid
│   │   │   ├── COGProperties.tsx    # Accordion list of all properties
│   │   │   └── FinancialOverview.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

---

## Tech Stack

### Backend

| Package | Why |
|---|---|
| **FastAPI** | Async, auto-generates OpenAPI docs at `/docs`, Pydantic validation built in |
| **uvicorn** | ASGI server, runs FastAPI locally |
| **python-dotenv** | Loads `.env` credentials without touching code |
| **requests** | HTTP client used by both API clients |
| **pydantic** | Comes with FastAPI, used for response models |
| **cryptography** | RSA key parsing (kept for iSolarCloud key format normalisation) |

```
# backend/requirements.txt
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
python-dotenv>=1.0.0
requests>=2.31.0
pydantic>=2.0.0
cryptography>=42.0.0
```

### Frontend

| Package | Why |
|---|---|
| **Vite** | Fast dev server, instant HMR, handles TypeScript out of the box |
| **React 18** | Component model, concurrent rendering |
| **TypeScript** | Catches API shape mismatches before they become runtime bugs |
| **TanStack Query v5** | Server state management — caching, polling, loading/error states |
| **Nivo** | Chart library (`@nivo/core`, `@nivo/line`, `@nivo/bar`, `@nivo/bump`, `@nivo/pie`, `@nivo/scatterplot`) — composable, SVG-based, theming via a single config object |
| **shadcn/ui** | Radix-based component primitives (Button, Select, etc.) — own the code |
| **Tailwind CSS v3** | Utility classes |
| **React Router v6** | Client-side routing between pages |
| **lucide-react** | Icon set used in TopBar and Sidebar |

Recharts was removed during the frontend rebuild. All charts use Nivo.

---

## Setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your credentials:

```
# WITS (required)
WITS_CLIENT_ID=your_client_id_here
WITS_CLIENT_SECRET=your_client_secret_here

# iSolarCloud (optional — solar endpoints return 503 until configured)
app_key=your_appkey_here
secret_key=your_secret_key_here
app_id=1266
redirect_uri=http://localhost:8000/api/solar/auth/callback
ISOLAR_SERVER=Australia          # China | International | Europe | Australia
```

Start the API server:

```bash
uvicorn main:app --reload
```

FastAPI runs at `http://localhost:8000`. Interactive API docs at `http://localhost:8000/docs`.

#### iSolarCloud one-time OAuth2 setup

Only needs to be done once. Tokens persist in `token_store.json` and auto-refresh.

1. Start the backend
2. Open `http://localhost:8000/api/solar/auth/url` — copy the returned URL
3. Open that URL in a browser, log in to iSolarCloud, approve access
4. Browser redirects to `http://localhost:8000/api/solar/auth/callback?code=...` automatically
5. Server returns `{"detail": "Authorised. Tokens saved — solar endpoints are now active."}`
6. `GET /api/solar/plants` should now return plant data

**Developer portal settings required:**
- Authorize with OAuth2.0: **Yes**
- Redirect URL: `http://localhost:8000/api/solar/auth/callback`
- App ID shown on the portal page (short numeric ID, e.g. `1266`)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

React runs at `http://localhost:5173` (Vite default).

You need both terminals running at the same time.

---

## FastAPI Routes

### WITS — NZ Electricity Market (`/api/`)

```
GET /api/prices
    ?schedule=RTD&marketType=E&nodes=OTA2201,HAY2201&back=48

GET /api/prices/spread
    ?nodeA=HAY2201&nodeB=BEN2201&schedule=RTD&back=48

GET /api/schedules

GET /api/nodes

GET /api/quantities/energy
    ?schedule=PRS&island=NI&back=24

GET /api/quantities/reserves
    ?schedule=PRS&runClass=InstantaneousReserve&island=NI&back=24
```

### iSolarCloud — Solar Inverters (`/api/solar/`)

```
GET  /api/solar/auth/url        — Returns the iSolarCloud OAuth2 consent URL (one-time setup)
GET  /api/solar/auth/callback   — Receives ?code= from iSolarCloud redirect, saves tokens
GET  /api/solar/auth/status     — { "authorised": true/false }

GET  /api/solar/plants
    — List all plants linked to the account
      Returns: ps_id, ps_name, ps_location, installed_capacity,
               latitude, longitude, fault_status, valid_flag

GET  /api/solar/plants/{id}/devices
    — List inverters and ESS devices for a plant (device_type 1 and 14 only)
      Returns: ps_key, device_sn, device_type, type_name,
               fault_status (1=Fault, 2=Alarm, 4=Normal), device_code
      Sorted by device_code (Inverter 1 before Inverter 2)
      Polled every 5 minutes by PropertyHeader

GET  /api/solar/plants/{id}/realtime
    — Live data for one plant (5-min cadence from iSolarCloud)
      Points: power, daily_yield, total_yield, load_power,
              daily_load_consumption, grid_active_power,
              feed_in_energy_today, feed_in_energy_total,
              energy_purchased_today, pcs_total_active_power,
              battery_soc, daily_battery_charge, daily_battery_discharge,
              ambient_temperature, irradiance

GET  /api/solar/plants/{id}/history
    ?start=YYYYMMDDHHMMSS&end=YYYYMMDDHHMMSS&interval=5
    — Minute-resolution historical data for the same point IDs

GET  /api/solar/plants/{id}/energy/ytd
    ?year=2026  (optional, defaults to current year)
    — YTD kWh total via getPowerStationPointDayMonthYearDataList (one API call, monthly aggregates)
      Returns: { year, ytd_kwh, months: [] }
      Implementation: sums p83022 monthly totals with data_type=4 (Total), query_type=month
```

**getPowerStationPointDayMonthYearDataList parameters (confirmed working):**

| Parameter | Type | Value for monthly | Notes |
|---|---|---|---|
| `ps_id_list` | List | `[int(plant_id)]` | Integer IDs in a list |
| `data_point` | String | `"p83022"` | daily_yield point |
| `start_time` | String | `"202601"` | YYYYMM for monthly |
| `end_time` | String | `"202612"` | YYYYMM for monthly |
| `query_type` | String | `"month"` | day / month / year |
| `data_type` | String | `"4"` | 4=Total (use for monthly/yearly) |
| `order` | Integer | `0` | 0=chronological |
| `is_get_point_dict` | String | `"1"` | optional |

Response shape: `result_data[str(plant_id)]["p83022"]` → list of `{"4": "5347300.0", "time_stamp": "202601"}`
Values are in Wh. Key is the data_type string (`"4"`), not the point name.

**iSolarCloud point IDs in use:**

| Point ID | Field | Unit | Notes |
|---|---|---|---|
| 83033 | power | W | PV output power |
| 83022 | daily_yield | Wh | Today's PV yield |
| 83024 | total_yield | Wh | All-time PV yield |
| 83106 | load_power | W | Site load |
| 83118 | daily_load_consumption | Wh | Today's total consumption |
| 83549 | grid_active_power | W | Grid flow (+ve import, −ve export) |
| 83072 | feed_in_energy_today | Wh | Exported to grid today |
| 83075 | feed_in_energy_total | Wh | Lifetime export to grid |
| 83102 | energy_purchased_today | Wh | Imported from grid today |
| 83046 | pcs_total_active_power | W | Battery power (undocumented plant-level point) |
| 83252 | battery_soc | % | Battery state of charge |
| 83243 | daily_battery_charge | Wh | Battery charged today (undocumented) |
| 83244 | daily_battery_discharge | Wh | Battery discharged today (undocumented) |
| 83016 | ambient_temperature | °C | |
| 83012 | irradiance | W/m² | (undocumented plant-level point) |

Battery points (83046, 83243, 83244, 83252) currently return null — no batteries installed yet.
If plant-level battery points prove unreliable after install, switch to device-level endpoint
`getDeviceRealTimeData` using ESS point IDs (13141 SOC, 13126 charge power, 13150 discharge power).

**Known plants (as of May 2026):**

| ps_id | Name | solar_ps_id in JSON |
|---|---|---|
| 1687012 | Hornby High School | ✓ configured |
| 1685973 | Manurewa Rural Campus | not yet |
| 1685943 | Manurewa Intermediate — Gymnasium | not yet |
| 1685938 | Manurewa Intermediate — Main Building | not yet |
| 1624093 | Aquatic Centre | not yet |

**Known devices — Hornby High School (1687012):**

| ps_key | Serial | Type | Notes |
|---|---|---|---|
| 1687012_1_1_1 | A24C2567766 | Inverter (type 1) | Inverter 1 |
| 1687012_1_2_1 | A24C1907022 | Inverter (type 1) | Inverter 2 |

Each route validates inputs with Pydantic and returns clean, flat JSON.
The React layer never parses nested API structures.

---

## Global State

### WITSContext (`src/context/WITSContext.tsx`)

All WITS filter controls. All TanStack Query hooks read from this context.

```typescript
interface DashboardState {
  schedule: string;              // default "RTD"
  marketType: "E" | "R";        // default "E"
  nodes: string[];               // default ["OTA2201", "HAY2201", "BEN2201"]
  island: "NI" | "SI" | "BOTH"; // default "BOTH"
  timeRange: "LIVE" | "1H" | "6H" | "24H" | "7D" | "CUSTOM";
  from?: string;                 // ISO string, only when CUSTOM
  to?: string;
  autoRefresh: boolean;          // default true
  refreshInterval: 30 | 60 | 300; // seconds, default 30
}
```

### PropertiesContext (`src/context/PropertiesContext.tsx`)

Wraps the whole app (survives route changes). `selectedPropertyId` drives both which property
panel is expanded on the COG Properties page and which property the detail widgets render for.
Defaults to `"hornby-high-school"` so the page always opens with a panel expanded.

```typescript
interface PropertiesContextValue {
  selectedPropertyId: string;
  setSelectedPropertyId: (id: string) => void;
  property: Property | null;
  allProperties: Property[];
  weatherData: OpenMeteoResponse | null | undefined;
  weatherIsLoading: boolean;
  weatherIsError: boolean;
  weatherLastFetched: Date | null;
  refetchWeather: () => void;
}
```

### Hook signatures

```typescript
// WITS
usePrices(overrides?: Partial<PricesParams>, enabled?: boolean)
usePriceSpread(nodeA: string, nodeB: string, overrides?, enabled?)
useEnergyQuantities(overrides?: Partial<EnergyParams>, enabled?)
useReserveQuantities(runClass: string, overrides?, enabled?)
useSchedules()   // static, no context
useNodes()       // static, no context

// Solar
useSolarDevices(psId: string | undefined)   // device list, 5-min poll
useSolarRealtime(psId: string | undefined)  // live power + yield, 5-min poll
useSolarHistory(psId: string | undefined, period: "day" | "week" | "month")  // chart data
useSolarYTD(psId: string | undefined)       // YTD kWh from /energy/ytd, 1-hour staleTime
```

---

## Property Data Model

Each property lives in `src/data/properties/{id}.json` and must satisfy `Property` in
`src/types/property.ts`. Add a new file + registry entry in `src/hooks/useProperty.ts`
to make a new property appear on the COG Properties page automatically.

Key fields:

```typescript
interface Property {
  id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  type: "school" | "commercial" | "industrial" | "residential";
  solar_ps_id?: string;   // iSolarCloud ps_id — enables live data on PropertyHeader
  system: {
    capacity_kw: number;
    panels: number;
    inverters: number;
    inverter_kw: number;
    // ...
  };
  contract: { ... };
  weather: { lat: number; lng: number; timezone: string; ... };
}
```

`solar_ps_id` links a property to its iSolarCloud plant. If absent, the PropertyHeader
shows `—` for live output and no inverter status lights.

---

## Layout

```
┌─────────────────────────────────────────────────────────┐
│  TopBar (48px) — hamburger │ COG DASHBOARD │ time range │
├─────────────────────────────────────────────────────────┤
│  Page tabs — NZX WITS Data │ COG Properties │ Financials│
├─────────────────────────────────────────────────────────┤
│  Page content (scrollable)                              │
│                                                         │
│  COG Properties — accordion rows, one always open:      │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Hornby High School [SCHOOL]  [pills]  ● Inv1     │   │
│  │ 180 Waterloo Road...         ●Inv2  20kW 327kWh ▼│   │
│  ├──────────────────────────────────────────────────┤   │
│  │  12-col detail grid (widgets)                    │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Manurewa Rural Campus [SCHOOL] ...            ▶  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**PropertyHeader** — prop-driven accordion card. Receives `property`, `isExpanded`, `onToggle`.
Fetches its own live data independently (`useSolarDevices` + `useSolarRealtime`). Shows:
- Left: name, type badge, address
- Center-left: system / panels / inverters stat pills
- Center-right: per-inverter status lights (green pulsing = Normal, orange = Alarm, red = Fault)
- Right: live kW (green when generating) + kWh today + expand chevron

**TopBar** — persistent, 48px. Left: hamburger + wordmark. Center: time range strip.
Right: pulsing live dot + manual refresh button.

**Sidebar** — 240px slide-in. Manages local draft state; hits WITSContext only on APPLY.

**WidgetCard** — base wrapper. Props: `title`, `subtitle?`, `live?`, `colSpan?`, `children`.
Exports `WidgetSkeleton` for loading states.

---

## Design

Tesla Energy / Powerwall dashboard aesthetic. Dense, data-forward, control-room feel.

### Palette

| Token | Hex | Usage |
|---|---|---|
| Background | `#0A0A0A` | Page background |
| Surface | `#111111` | Cards, TopBar, Sidebar |
| Elevated | `#1A1A1A` | Inputs, secondary surfaces |
| Border | `#2A2A2A` | All borders — barely visible |
| Accent | `#E31937` | Active states, live indicators, crosshair |
| Text primary | `#FFFFFF` | KPI values, active labels |
| Text secondary | `#A0A0A0` | Card titles, axis labels |
| Text muted | `#505050` | Disabled, tick labels, subtitles |

No purple. No gradients. No rounded pill buttons. No glassmorphism.

### Typography

- **Inter** — UI labels, body text
- **Roboto Mono** — all price/number display values (`tabular-nums` where applicable)
- Both loaded from Google Fonts in `index.html`

### Chart colors (Nivo series, in order)

```typescript
// src/lib/nivoTheme.ts
export const CHART_COLORS = [
  "#60A5FA", // blue-400
  "#34D399", // emerald-400
  "#FBBF24", // amber-400
  "#F472B6", // pink-400
  "#818CF8", // violet-400
  "#38BDF8", // sky-400
  "#FB923C", // orange-400
  "#A3E635", // lime-400
];
```

Tesla red (`#E31937`) is reserved for UI chrome only — it never appears as a data series color.

### Nivo theme

Defined once in `src/lib/nivoTheme.ts` and passed as `theme={nivoTheme}` to every chart.
Key values: `background: "transparent"`, grid lines `#1E1E1E`, crosshair `#E31937`.

---

## Widget Roadmap

### Phase 1 — Core (Prices page) ✓ Complete

| Widget | File | Status | Data |
|---|---|---|---|
| Node price chart | `wits/PriceChart.tsx` | ✓ | `GET /api/prices` — multi-node line chart |
| Latest price KPIs | `wits/PriceKPIs.tsx` | ✓ | Reuses `usePrices()` cache |
| NI/SI price spread | `wits/PriceSpread.tsx` | ✓ | `GET /api/prices/spread` |
| RTD vs pre-dispatch | `wits/ScheduleOverlay.tsx` | ✓ | Two `usePrices()` calls pinned to RTD + PRSL |

### Phase 2 — Quantities (Quantities page) ✓ Complete

| Widget | File | Status | Data |
|---|---|---|---|
| Island generation vs load | `wits/IslandBalance.tsx` | ✓ | `GET /api/quantities/energy` |
| Intermittent generation % | `wits/IntermittentShare.tsx` | ✓ | Same endpoint |
| Forward price curve | `wits/ForwardCurve.tsx` | ✓ | `GET /api/prices` PRSL forward |

### Phase 3 — COG Properties ✓ In progress

| Widget | File | Status | Data |
|---|---|---|---|
| Property accordion header | `property/PropertyHeader.tsx` | ✓ | `useSolarDevices` + `useSolarRealtime` |
| Current output | `property/EstimatedOutput.tsx` | ✓ | Estimated from GHI weather |
| Weather now | `property/WeatherNow.tsx` | ✓ | Open-Meteo |
| Annual progress | `property/AnnualProgress.tsx` | ✓ | **Live** — `useSolarYTD` → `/energy/ytd` |
| CO₂ avoided | `property/CarbonOffset.tsx` | ✓ | Estimated |
| Generation chart | `property/GenerationChart.tsx` | ✓ | **Live** — day/week/month via `useSolarHistory` |
| Solar irradiance | `property/SolarIrradianceChart.tsx` | ✓ | Open-Meteo |
| School consumption | `property/SchoolConsumption.tsx` | ✓ | Estimated profile |
| Grid export | `property/GridExport.tsx` | ✓ | Estimated |
| System specs | `property/SystemStats.tsx` | ✓ | Static from property JSON |
| PPA details | `property/PPADetails.tsx` | ✓ | Static from property JSON |
| 7-day forecast | `property/WeatherForecast.tsx` | ✓ | Open-Meteo |

**GenerationChart notes:**
- Day view: 5-min interval line chart with time slider + `HH:MM · kW` readout. `isInteractive={false}`, custom SVG marker layer.
- Week/month view: bar chart of daily kWh from `/yields` endpoint.
- Year option removed — not implemented.
- Duplicate `HH:MM` labels (from chunked history API boundaries) deduplicated in `useSolarHistory.toDayPoints`.

**COGProperties layout (12-col grid):**
- Row 1: Current Output (3) | Weather Now (3) | 7-Day Forecast (6)
- Row 2: PV Generation chart (7) | Solar Irradiance (5)
- Row 3: System Specs (4) | PPA Details (3) | Annual Generation Target (3) | Est. CO₂ Avoided (2)

**Next for Phase 3:**
- Wire live iSolarCloud data into SchoolConsumption / GridExport (SchoolConsumption hidden from dropdown but file kept)
- Add remaining 4 properties to the registry (`solar_ps_id` + property JSON files)
- Battery widgets once hardware is installed (~mid 2026)

### Phase 4 — Reserves

| Widget | File | Status | Data |
|---|---|---|---|
| Reserve MW vs risk MW | `wits/ReserveGauge.tsx` | not started | `GET /api/quantities/reserves` |
| Reserve price ticker | `wits/ReservePrices.tsx` | not started | `GET /api/prices` with `marketType=R` |

### Phase 5 — Polish

- Last-updated timestamp on each widget card
- Price spike highlighting (configurable threshold)
- Node comparison table with sortable columns
- Mobile-responsive layout

---

## Open Investigations / TODOs

- **NZ MetService API** — explore as a replacement/supplement for Open-Meteo cloud cover.
  MetService provides satellite-derived cloud data for NZ which would be far more accurate than
  the NWP model values Open-Meteo uses. Current workaround: cloud cover is derived from actual
  iSolarCloud irradiance (83012) vs a clear-sky model during daylight hours. MetService would
  give accurate cloud cover at all times including night and for properties without solar sensors.

---

## Implementation Notes

### X-axis uniqueness (important)
Nivo's `xScale: { type: "point" }` requires unique x values. Using formatted `HH:MM` strings
causes duplicates on any range ≥ 24H (the same time label appears twice). Fix: store the full
ISO timestamp as the Nivo `x` key, and use `xFormat` + `axisBottom.format` to display `HH:MM`
only on screen. This is implemented in all Phase 1 widgets.

For GenerationChart day view, the chunked history API can return duplicate timestamps at
3-hour chunk boundaries. These are deduplicated in `toDayPoints` using a `Set<string>` keyed
on `HH:MM` — first occurrence wins.

### TanStack Query deduplication
`PriceKPIs` calls `usePrices()` with the same default params as `PriceChart`. TanStack Query
returns the cached response — no second API call is made. Both components stay in sync on
every refetch.

### ScheduleOverlay always pins RTD + PRSL
Even when the global schedule selector is changed, ScheduleOverlay passes
`{ schedule: "RTD" }` and `{ schedule: "PRSL" }` as overrides to `usePrices()`.

### PRSL opacity in ScheduleOverlay
PRSL series colors use 8-digit hex (`#RRGGBBAA`). The base color gets `"99"` appended
(≈ 60% opacity) to visually distinguish pre-dispatch from actual RTD prices.

### PropertyHeader expansion state
`selectedPropertyId` in `PropertiesContext` drives which property panel is open on the
COG Properties page. Because the context wraps the whole app and survives route changes,
switching to NZX WITS Data and back always restores the previously open property.
Clicking a different property header calls `setSelectedPropertyId` — the detail widgets
below re-render for the new property automatically.

### Battery point IDs
Plant-level battery points 83046 / 83243 / 83244 are not in the iSolarCloud API reference.
83252 (SOC) is documented. If any return null after battery installation, fall back to device-level
`getDeviceRealTimeData` with ESS point IDs (13141, 13126, 13150, 13028, 13029).

---

## Known Constraints (from WITS API)

- Rolling window for prices: **−7 to +7 TP** (~3.5 hours each direction)
- Quantities window: **−24 to +24 TP** (12 hours each direction)
- `back`/`forward` and `from`/`to` are mutually exclusive — enforced in FastAPI validation
- `forward` only returns data for schedules that publish pre-dispatch: PRSL, PRSS, NRSL, NRSS, WDS
- Max 10,000 records per call — pagination needed for long date-range queries (Phase 5)
- Quantities API requires a separate WITS subscription from Market Prices
- `back`/`forward` validated with `ge=1, le=48` at the FastAPI layer

---

## .gitignore

```
backend/.env
backend/venv/
frontend/node_modules/
frontend/dist/
*.pyc
__pycache__/
.DS_Store
```
