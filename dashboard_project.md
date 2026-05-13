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
│   │   │   ├── ui/           # shadcn/ui primitives (auto-generated, don't edit)
│   │   │   ├── widgets/      # Dashboard widgets — one file per widget
│   │   │   └── layout/       # Sidebar, header, tab nav
│   │   ├── hooks/
│   │   │   └── useWITS.ts    # TanStack Query hooks — one per API endpoint
│   │   ├── lib/
│   │   │   └── api.ts        # Fetch wrappers pointing at FastAPI
│   │   ├── pages/
│   │   │   ├── Prices.tsx
│   │   │   └── Quantities.tsx
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
| **TanStack Query v5** | Server state management — handles caching, polling, loading/error states cleanly |
| **shadcn/ui** | Component primitives (not a library you install, you own the code). Dark mode out of the box, unstyled enough to look original |
| **Tailwind CSS v3** | Utility classes, pairs with shadcn |
| **Recharts** | Chart library that works naturally with React and Tailwind. Composable, not config-heavy |
| **React Router v6** | Client-side routing between pages |

Vite is chosen over Create React App (deprecated) and Next.js (overkill for a local dashboard with no SSR requirements).

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

## FastAPI Routes to Build

These are the endpoints React will call. They map directly to WITS API calls in `wits_client.py`.

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
The React layer should never have to parse nested WITS API structures.

---

## Widget Roadmap

Build in this order. Each widget is one file in `src/components/widgets/`.

### Phase 1 — Core (build first)

| Widget | File | Data |
|---|---|---|
| Node price chart | `PriceChart.tsx` | `GET /api/prices` — multi-node line chart |
| NI/SI price spread | `PriceSpread.tsx` | `GET /api/prices/spread` — HAY vs BEN area diff |
| Latest price KPIs | `PriceKPIs.tsx` | Same data as price chart, just latest value per node |
| RTD vs pre-dispatch overlay | `ScheduleOverlay.tsx` | Two `GET /api/prices` calls, RTD + PRSL on same chart |

### Phase 2 — Quantities

| Widget | File | Data |
|---|---|---|
| Island generation vs load | `IslandBalance.tsx` | `GET /api/quantities/energy` — grouped bar NI vs SI |
| Intermittent generation % | `IntermittentShare.tsx` | Same endpoint, `intermittentGeneration / generation` |
| Forward price curve | `ForwardCurve.tsx` | `GET /api/prices` with `forward=7`, PRSL schedule |

### Phase 3 — Reserves

| Widget | File | Data |
|---|---|---|
| Reserve MW vs risk MW | `ReserveGauge.tsx` | `GET /api/quantities/reserves` — headroom indicator |
| Reserve price ticker | `ReservePrices.tsx` | `GET /api/prices` with `marketType=R` |

### Phase 4 — Polish

- Auto-refresh toggle with configurable interval (30s / 60s / 5min)
- Last-updated timestamp on each widget
- Price spike highlighting (configurable threshold)
- Node comparison table with sortable columns
- Mobile-responsive layout

---

## Design Direction

Dark theme. The NZ electricity market runs 24/7 and the dashboard should feel like something
a grid operator would actually use — dense, precise, data-forward. Not a marketing page.

Reference aesthetic: terminal-inspired but cleaned up. Monospace accents on numbers.
Tight grid layout. Colour used sparingly and semantically — green for generation surplus,
amber for price warnings, red for spikes. No decorative gradients.

shadcn/ui's `dark` class on the root handles the baseline. Customise from there.
Avoid the default shadcn grey palette — swap to a warmer neutral or a slate-with-blue-tint.

Font pairing: **IBM Plex Mono** for all price/number display, **Geist** or
**DM Sans** for labels and UI text. Both free, both sharp.

---

## Development Sequence

1. Get FastAPI running and returning data from `wits_client.py` — verify at `/docs`
2. Scaffold React with Vite + TypeScript + Tailwind + shadcn
3. Wire up TanStack Query with a basic `useWITS` hook hitting `GET /api/prices`
4. Build `PriceChart.tsx` — this is the skeleton everything else hangs off
5. Add `PriceKPIs.tsx` using the same query data (no extra fetch)
6. Build `PriceSpread.tsx` — the most informative single widget
7. Add auto-refresh to TanStack Query (`refetchInterval`)
8. Build Phase 2 quantities widgets
9. Layout polish, responsive breakpoints, design pass

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

---

## Known Constraints Carried Over from Streamlit Project

- WITS API rolling window for prices: **-7 to +7 TP** (~3.5 hours each direction)
- Quantities window is longer: **-24 to +24 TP** (12 hours each direction)
- `back`/`forward` and `from`/`to` are mutually exclusive — enforce this in FastAPI validation
- `forward` only returns data for schedules that publish pre-dispatch: PRSL, PRSS, NRSL, NRSS, WDS
- Max 10,000 records per call — pagination needed for long date-range queries (Phase 4)
- Quantities API requires a separate WITS subscription from Market Prices
