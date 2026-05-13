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
Browser (React) ──► FastAPI (localhost:8000) ──► WITS API (electricityinfo.co.nz)
```

React never talks to WITS directly. FastAPI owns the credentials, handles OAuth tokens, and
serves clean JSON. This means:

- Credentials live in a `.env` file, not a sidebar input field
- Token refresh happens server-side and is invisible to the UI
- React can poll FastAPI on a timer for live data without re-authenticating
- CORS is a non-issue because both services are on localhost

---

## Repo Structure

```
cog-dashboard-ui/
├── backend/
│   ├── main.py               # FastAPI app, route definitions
│   ├── wits_client.py        # Copied from Streamlit project, unchanged
│   ├── models.py             # Pydantic response models
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
│   │   │       ├── PriceChart.tsx    # ✓ Multi-node spot price line chart
│   │   │       ├── PriceKPIs.tsx     # ✓ Latest $/MWh per node + delta
│   │   │       ├── PriceSpread.tsx   # ✓ HAY−BEN spread line + area fill
│   │   │       ├── ScheduleOverlay.tsx # ✓ RTD vs PRSL overlay
│   │   │       ├── IslandBalance.tsx # stub — Phase 2
│   │   │       ├── IntermittentShare.tsx # stub — Phase 2
│   │   │       └── ForwardCurve.tsx  # stub — Phase 2
│   │   ├── context/
│   │   │   └── DashboardContext.tsx  # Global filter state (schedule, nodes, timeRange…)
│   │   ├── hooks/
│   │   │   └── useWITS.ts    # TanStack Query hooks — all read from DashboardContext
│   │   ├── lib/
│   │   │   ├── api.ts        # Fetch wrappers pointing at FastAPI
│   │   │   ├── nivoTheme.ts  # Shared Nivo theme + CHART_COLORS palette
│   │   │   └── utils.ts      # cn() helper
│   │   ├── pages/
│   │   │   ├── Prices.tsx    # Phase 1 widget grid (all 4 widgets live)
│   │   │   └── Quantities.tsx # Phase 2 widget grid (stubs)
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
| **requests** | Already used in `wits_client.py` — keep it |
| **pydantic** | Comes with FastAPI, used for response models |

```
# backend/requirements.txt
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
python-dotenv>=1.0.0
requests>=2.31.0
pydantic>=2.0.0
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
WITS_CLIENT_ID=your_client_id_here
WITS_CLIENT_SECRET=your_client_secret_here
```

Start the API server:

```bash
uvicorn main:app --reload
```

FastAPI runs at `http://localhost:8000`. Interactive API docs at `http://localhost:8000/docs`.

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

Each route validates inputs with Pydantic and returns clean, flat JSON.
The React layer never parses nested WITS API structures.

---

## Global State — DashboardContext

All filter controls live in `src/context/DashboardContext.tsx`. All TanStack Query hooks
read from this context. When context state changes, queries automatically refetch because
the query key includes the state values.

```typescript
interface DashboardState {
  schedule: string;           // default "RTD"
  marketType: "E" | "R";     // default "E"
  nodes: string[];            // default ["OTA2201", "HAY2201", "BEN2201"]
  island: "NI" | "SI" | "BOTH"; // default "BOTH"
  timeRange: "LIVE" | "1H" | "6H" | "24H" | "7D" | "CUSTOM";
  from?: string;              // ISO string, only when CUSTOM
  to?: string;
  autoRefresh: boolean;       // default true
  refreshInterval: 30 | 60 | 300; // seconds, default 30
}
```

`timeRange` maps to API params as follows:

| timeRange | back param |
|---|---|
| LIVE | 7 TPs (~3.5 hours) |
| 1H | 2 TPs |
| 6H | 12 TPs |
| 24H | 48 TPs |
| 7D | 48 TPs (WITS cap) |
| CUSTOM | `from` / `to` passed directly |

### Hook signatures

```typescript
usePrices(overrides?: Partial<PricesParams>, enabled?: boolean)
usePriceSpread(nodeA: string, nodeB: string, overrides?, enabled?)
useEnergyQuantities(overrides?: Partial<EnergyParams>, enabled?)
useReserveQuantities(runClass: string, overrides?, enabled?)
useSchedules()   // static, no context
useNodes()       // static, no context
```

`overrides` lets a widget pin specific params regardless of context. ScheduleOverlay
uses this to always show RTD + PRSL even when the global schedule selector is changed.

---

## Layout

```
┌─────────────────────────────────────────────────────────┐
│  TopBar (48px) — hamburger │ COG DASHBOARD │ time range │
├─────────────────────────────────────────────────────────┤
│  Page tabs — Prices │ Quantities                        │
├──────┬──────────────────────────────────────────────────┤
│Slide │  DashboardGrid (1→2→3 col responsive)           │
│-in   │  ┌──────────────┐ ┌──────────────┐ ┌──────┐    │
│Side  │  │  WidgetCard  │ │  WidgetCard  │ │Widget│    │
│bar   │  └──────────────┘ └──────────────┘ └──────┘    │
│      │  ...                                             │
└──────┴──────────────────────────────────────────────────┘
```

**TopBar** — persistent, 48px. Left: hamburger (toggles sidebar) + wordmark with Tesla-red
left-border accent. Center: `LIVE / 1H / 6H / 24H / 7D / CUSTOM` time range strip (active =
red fill, writes to DashboardContext). Right: pulsing live dot + `LIVE` label when in live mode
+ manual refresh button.

**Sidebar** — 240px slide-in panel. Manages local draft state; changes only hit DashboardContext
when `APPLY` is pressed. Contains: node multiselect, island toggle, schedule dropdown, market
type toggle, auto-refresh switch + interval picker.

**WidgetCard** — base wrapper for all widgets. Props: `title`, `subtitle?`, `live?`, `colSpan?`
(1/2/3), `children`. Header row is padded; chart content area has no padding so charts bleed to
card edges. Exports `WidgetSkeleton` for loading states.

**DashboardGrid** — `grid-cols-1 lg:grid-cols-2 xl:grid-cols-3` with `gap-4 p-6`.

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
Color assignment is index-based: the same node always gets the same color within a session.

### Nivo theme

Defined once in `src/lib/nivoTheme.ts` and passed as `theme={nivoTheme}` to every chart.
Key values: `background: "transparent"`, grid lines `#1E1E1E`, crosshair `#E31937`.

---

## Widget Roadmap

### Phase 1 — Core (Prices page) ✓ Complete

| Widget | File | Status | Data |
|---|---|---|---|
| Node price chart | `PriceChart.tsx` | ✓ Built | `GET /api/prices` — multi-node line chart |
| Latest price KPIs | `PriceKPIs.tsx` | ✓ Built | Reuses `usePrices()` cache — latest value + TP delta |
| NI/SI price spread | `PriceSpread.tsx` | ✓ Built | `GET /api/prices/spread` — HAY−BEN line + area fill |
| RTD vs pre-dispatch | `ScheduleOverlay.tsx` | ✓ Built | Two `usePrices()` calls pinned to RTD + PRSL |

### Phase 2 — Quantities (Quantities page)

| Widget | File | Status | Data |
|---|---|---|---|
| Island generation vs load | `IslandBalance.tsx` | stub | `GET /api/quantities/energy` — grouped bar NI vs SI |
| Intermittent generation % | `IntermittentShare.tsx` | stub | Same endpoint — `intermittentGeneration / generation` |
| Forward price curve | `ForwardCurve.tsx` | stub | `GET /api/prices` with `forward=7`, PRSL schedule |

### Phase 3 — Reserves

| Widget | File | Status | Data |
|---|---|---|---|
| Reserve MW vs risk MW | `ReserveGauge.tsx` | not started | `GET /api/quantities/reserves` |
| Reserve price ticker | `ReservePrices.tsx` | not started | `GET /api/prices` with `marketType=R` |

### Phase 4 — Polish

- Auto-refresh already wired to context (`autoRefresh` + `refreshInterval`)
- Last-updated timestamp on each widget card
- Price spike highlighting (configurable threshold)
- Node comparison table with sortable columns
- Mobile-responsive layout

---

## Implementation Notes

### X-axis uniqueness (important)
Nivo's `xScale: { type: "point" }` requires unique x values. Using formatted `HH:MM` strings
causes duplicates on any range ≥ 24H (the same time label appears twice). Fix: store the full
ISO timestamp as the Nivo `x` key, and use `xFormat` + `axisBottom.format` to display `HH:MM`
only on screen. This is implemented in all four Phase 1 widgets.

### TanStack Query deduplication
`PriceKPIs` calls `usePrices()` with the same default params as `PriceChart`. TanStack Query
returns the cached response — no second API call is made. Both components stay in sync on
every refetch.

### ScheduleOverlay always pins RTD + PRSL
Even when the global schedule selector in the Sidebar is changed, ScheduleOverlay passes
`{ schedule: "RTD" }` and `{ schedule: "PRSL" }` as overrides to `usePrices()`. The override
merges over the context value, so the widget always compares the same two schedules.

### PRSL opacity in ScheduleOverlay
PRSL series colors use 8-digit hex (`#RRGGBBAA`). The base color gets `"99"` appended
(≈ 60% opacity in hex) to visually distinguish pre-dispatch from actual RTD prices without
requiring per-series dash styling (which Nivo Line doesn't support natively).

---

## Known Constraints (from WITS API)

- Rolling window for prices: **−7 to +7 TP** (~3.5 hours each direction)
- Quantities window: **−24 to +24 TP** (12 hours each direction)
- `back`/`forward` and `from`/`to` are mutually exclusive — enforced in FastAPI validation
- `forward` only returns data for schedules that publish pre-dispatch: PRSL, PRSS, NRSL, NRSS, WDS
- Max 10,000 records per call — pagination needed for long date-range queries (Phase 4)
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
