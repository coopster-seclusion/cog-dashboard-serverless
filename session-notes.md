# Frontend Rebuild — Session Prompt

Paste this into Claude (VS Code extension) at the root of your repo.
Attach: `cog-dashboard-ui-project.md`, `session-notes.md`, `App.tsx`, `lib/api.ts`, `hooks/useWITS.ts`

---

## Context

The backend is complete and verified. The frontend scaffolded and ran clean but the UI needs
a full redesign before we build widgets. We are rebuilding the frontend styling, layout, and
chart library from scratch before writing a single widget. Do not touch anything in `backend/`.

## Design Direction — Tesla Energy Dashboard

Reference: Tesla Energy / Powerwall dashboard aesthetic.
- **Background**: near-black `#0A0A0A`, card surfaces `#111111`, elevated surfaces `#1A1A1A`
- **Accent**: Tesla red `#E31937` for primary actions, highlights, and live indicators
- **Text**: pure white `#FFFFFF` for primary values, `#A0A0A0` for labels, `#505050` for muted/disabled
- **Borders**: `1px solid #2A2A2A` — barely visible, just enough to define cards
- **Typography**: **Inter** for UI labels and body text. **Inter Mono** or **Roboto Mono**
  for all numeric/price display values. Both available via Google Fonts.
- **Charts**: clean lines, no fills unless showing area diff, minimal grid lines (`#1E1E1E`),
  no chart borders, legends below or inline — never boxed
- **Cards**: no border-radius above `6px`, no drop shadows, subtle `1px` border only
- **Motion**: minimal — only data updates and hover states. No page transition animations.
  Numbers should count up on first load.
- **Status indicators**: small pulsing red dot for live/real-time data feeds
- **Spacing**: tight and dense. This is a data dashboard, not a marketing page.

Do not use purple, blue gradients, glassmorphism, or rounded pill buttons.
Every element should feel like it belongs in a control room.

## Chart Library — Nivo

Remove Recharts (or Tremor if installed). Install and configure **Nivo**.

```bash
npm install @nivo/core @nivo/line @nivo/bar @nivo/area-bump @nivo/pie @nivo/scatterplot
```

Global Nivo theme to create and reuse across all charts (`src/lib/nivoTheme.ts`):

```typescript
export const nivoTheme = {
  background: "transparent",
  textColor: "#A0A0A0",
  fontSize: 11,
  fontFamily: "Inter, sans-serif",
  axis: {
    domain: { line: { stroke: "#2A2A2A", strokeWidth: 1 } },
    ticks: {
      line: { stroke: "#2A2A2A", strokeWidth: 1 },
      text: { fill: "#505050", fontSize: 11 },
    },
    legend: { text: { fill: "#A0A0A0", fontSize: 12 } },
  },
  grid: { line: { stroke: "#1E1E1E", strokeWidth: 1 } },
  legends: { text: { fill: "#A0A0A0", fontSize: 11 } },
  tooltip: {
    container: {
      background: "#1A1A1A",
      border: "1px solid #2A2A2A",
      borderRadius: "4px",
      color: "#FFFFFF",
      fontSize: 12,
      fontFamily: "Inter, sans-serif",
    },
  },
  crosshair: { line: { stroke: "#E31937", strokeWidth: 1, strokeOpacity: 0.5 } },
};
```

Series colors to use across charts (in order):
`["#E31937", "#FFFFFF", "#A0A0A0", "#FF6B6B", "#505050"]`

## Layout — Persistent Top Bar + Sidebar + Fixed Widget Grid

### Top Bar (`src/components/layout/TopBar.tsx`)
- Full width, height `48px`, background `#111111`, bottom border `1px solid #2A2A2A`
- Left: hamburger menu icon (toggles sidebar) + app title "COG DASHBOARD" in caps,
  letter-spacing wide, small Tesla-red left border accent
- Center: persistent time range controls — button strip for
  `LIVE` / `1H` / `6H` / `24H` / `7D` + a date range picker that appears on `CUSTOM`
- Right: live indicator (pulsing red dot + "LIVE" text when on live mode) +
  last-updated timestamp + manual refresh icon button
- Time range selection is global state (React Context) — all widgets respond to it

### Sidebar (`src/components/layout/Sidebar.tsx`)
- Width `240px`, slides in/out, background `#111111`, right border `1px solid #2A2A2A`
- Controlled by hamburger toggle in TopBar
- Contains:
  - **Node selector** — multiselect for grid nodes (OTA2201, HAY2201, etc.)
  - **Island filter** — toggle buttons: `BOTH` / `NI` / `SI`
  - **Schedule selector** — dropdown: RTD / Interim / Final / PRSL / PRSS / NRSL / NRSS / WDS
  - **Market type** — toggle: `ENERGY` / `RESERVES`
  - **Auto-refresh** — toggle switch + interval selector (30s / 60s / 5min)
  - A `APPLY` button at the bottom that pushes all selections into global state
- All controls styled dark: no white backgrounds, inputs use `#1A1A1A` background

### Widget Grid (`src/components/layout/DashboardGrid.tsx`)
- CSS Grid layout, 12-column base
- Widgets snap to grid — no drag/drop yet, just fixed positions
- Responsive breakpoints:
  - `xl` (1280px+): 3 columns of widgets
  - `lg` (1024px): 2 columns
  - `md` and below: 1 column stack
- Each widget wrapped in a `WidgetCard` component (see below)

### Widget Card (`src/components/layout/WidgetCard.tsx`)
Base wrapper used by every widget. Props: `title`, `subtitle?`, `live?`, `children`, `colSpan?`
- Background `#111111`, border `1px solid #2A2A2A`, border-radius `6px`
- Header row: title left (uppercase, `#A0A0A0`, `11px`, wide letter-spacing),
  optional live dot right
- No padding on chart area — charts bleed to card edges, padding only on header/footer
- Loading state: skeleton shimmer using `#1A1A1A` / `#222222` alternating

## Global State

Use React Context (not Redux — overkill here) for dashboard-wide filter state:

```typescript
// src/context/DashboardContext.tsx
interface DashboardState {
  schedule: string;          // "RTD"
  marketType: "E" | "R";    // "E"
  nodes: string[];           // ["OTA2201", "HAY2201"]
  island: "NI" | "SI" | "BOTH";
  timeRange: "LIVE" | "1H" | "6H" | "24H" | "7D" | "CUSTOM";
  from?: string;             // ISO string, only when CUSTOM
  to?: string;
  autoRefresh: boolean;
  refreshInterval: 30 | 60 | 300; // seconds
}
```

All TanStack Query hooks read from this context for their query params.
When state changes, queries automatically refetch because the query key includes the state values.

## Steps — Do In Order

### Step 1 — Clean out old styling
- Remove any existing chart library (Recharts/Tremor)
- Remove any terminal/monospace theme CSS
- Set `#0A0A0A` as the HTML body background in `index.css`
- Import Inter and Inter Mono from Google Fonts in `index.html`

### Step 2 — Install Nivo and create nivoTheme.ts
Install the Nivo packages listed above.
Create `src/lib/nivoTheme.ts` with the theme object above.

### Step 3 — Build layout components
Build in this order: `WidgetCard.tsx` → `TopBar.tsx` → `Sidebar.tsx` → `DashboardGrid.tsx`
Wire TopBar hamburger to Sidebar open/close state.
Time range controls in TopBar should be functional (updates context, no API call yet).

### Step 4 — Build DashboardContext
Create `src/context/DashboardContext.tsx` with the state shape above and default values.
Wrap `App.tsx` in the provider.
Update `hooks/useWITS.ts` to read from context instead of local state.

### Step 5 — Stub the widget grid
Place 6 empty `WidgetCard` components in `DashboardGrid.tsx` with placeholder titles
matching Phase 1 and Phase 2 widget names from project.md.
Confirm the grid layout looks correct at all three breakpoints before building any real widget.

### Step 6 — Stop
Do not build any widgets yet. The next session builds `PriceChart.tsx` as the first real widget
dropped into the grid.

Confirm each step works before moving to the next.