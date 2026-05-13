# Session Prompt — Dashboard Restructure
# NZX WITS Data Page + COG Properties Page + Sidebar Guard Rails + Time Bar Logic



Do NOT touch anything in `backend/`. Frontend only.
Keep the existing Tesla dark aesthetic — `#0A0A0A` background, Tesla red `#E31937` accents,
Inter + Inter Mono typography. We are adding widgets and restructuring pages, not restyling.

---

## 1. Rename Pages

| Old name    | New name          | Route    |
|-------------|-------------------|----------|
| Prices      | NZX WITS Data     | `/`      |
| Quantities  | COG Properties    | `/properties` |

Update `App.tsx` and any nav references accordingly.

---

## 2. NZX WITS Data Page — Widget Grid

This is the main page. Build all widgets listed below.
Use a 12-column CSS grid. Widths are in columns.

### Row 1 — Latest Price KPIs (always LIVE, always RTD)
Three node ticker cards side by side, full width (4 cols each).
Each card shows: node code as header, then 3 rows of `TP time | ↑↓ arrow | $/MWh`.
Arrow color: red `#E31937` for price up, `#4CAF50` for price down.
These never respond to the time range selector — they are always live RTD.
Show a small pulsing red "LIVE" dot on each card header.

### Row 2 — Island Balance Cards (always LIVE, always RTD/PRS quantities)
Four equal cards (3 cols each):

**Energy Generation** (col 1–3):
- Title + "PRS · NI + SI · TP {n}" in cyan top right
- Large bold total MW value
- Horizontal bi-color bar: `#FF8C00` (orange) for NI left, `#4CAF50` (green) for SI right
- NI MW and SI MW values below bar
- Source: `GET /api/quantities/energy?schedule=PRSS&back=1`

**Energy Demand** (col 4–6):
- Identical layout to Energy Generation
- Same source endpoint, different field (`load` not `generation`)

**NI Reserves** (col 7–9):
- Title "NI Reserves" + context label in cyan
- Two rows: Fast `{MW}` | Sustained `{MW}`
- Source: `GET /api/quantities/reserves?schedule=PRSS&island=NI&back=1`

**SI Reserves** (col 10–12):
- Identical layout, island=SI

All four Row 2 cards are always LIVE and ignore the global time range.
Show pulsing LIVE dot on each.

### Row 3 — RTD Price Map + Spot Prices Chart
**RTD Price Map** (col 1–7, tall card):
- SVG map of New Zealand (use the hardcoded coordinate set below)
- Grey `#2A2A2A` land fill, `#1A1A1A` background
- Node dots: small 6px circles in Tesla red `#E31937`
- Price label chips: `#111111` background, `1px solid #E31937` border, white text
  Format: `NODE · $/MWh`
- Connecting line from dot to chip: `1px #E31937` at 40% opacity
- Source: `GET /api/prices?schedule=RTD&marketType=E&nodes=OTA2201,HAY2201,BEN2201,
  WKM2201,STK0111,ISL2201,MRT2201,TAU2201&back=1`
- Always LIVE — ignores global time range
- "RTD Price Map" title + "TP {n} · {time}" in cyan top right

NZ node coordinates for the SVG (viewBox 0 0 300 500 — these are pre-mapped pixel positions):
```
OTA2201: [185, 148]   // Otahuhu, Auckland
MRT2201: [188, 155]   // Maraetai, Auckland
WKM2201: [165, 188]   // Whakamaru, Waikato
TAU2201: [185, 195]   // Taupo
STK0111: [143, 205]   // Stratford, Taranaki
HAY2201: [200, 268]   // Haywards, Wellington
ISL2201: [170, 355]   // Islington, Christchurch
BEN2201: [178, 390]   // Benmore
```
For the NZ SVG outline path, use a simplified version — search for a public domain SVG
of New Zealand's outline and trace the two main islands only. Do not use a map library.

**Spot Prices Chart** (col 8–12, tall card):
- Nivo line chart, multi-node, Tesla red + white + grey series colors
- Title "Spot Prices" + schedule + node list in cyan top right
- **This widget responds to the global time range selector**
- Source: `GET /api/prices` with params derived from time range (see Section 4)

### Row 4 — RTD vs PRSL Overlay (full width, 12 cols)
- Nivo line chart, two series: RTD (Tesla red) and PRSL (white, dashed)
- Shows where pre-dispatch diverges from real-time
- Title "RTD vs Pre-Dispatch" + "PRSL forward {n} TPs" in cyan
- Only shows when time range is LIVE or 1H — otherwise display a WidgetCard
  with message: "Overlay available in LIVE and 1H modes only"
- Source: two calls — `GET /api/prices?schedule=RTD` + `GET /api/prices?schedule=PRSL&forward=4`
- Node: whichever single node is first in the selected nodes list
- Does NOT use the global schedule selector — always RTD vs PRSL

---

## 3. COG Properties Page

Stub only for now. Single WidgetCard centered on the page:
"COG Properties dashboard coming soon. This page will display property-level
electricity data, billing analysis, and solar generation metrics."

The sidebar for this page is completely separate from NZX WITS Data (see Section 5).

---

## 4. Time Range → Schedule + Back Mapping

The top bar time range selector drives the Spot Prices chart and the RTD vs PRSL overlay only.
All other widgets on the page are always LIVE and ignore this selector.

Make this mapping a constant in `src/lib/timeRangeConfig.ts`:

```typescript
export const TIME_RANGE_CONFIG = {
  LIVE: {
    label: "LIVE",
    schedule: "RTD",
    back: 2,          // 1 hour look-back
    forward: 0,
    useDateRange: false,
    autoRefresh: true,
    scheduleOverrideable: false,  // user cannot change schedule in LIVE mode
    note: null,
  },
  "1H": {
    label: "1H",
    schedule: "RTD",
    back: 2,
    forward: 0,
    useDateRange: false,
    autoRefresh: false,
    scheduleOverrideable: false,
    note: null,
  },
  "6H": {
    label: "6H",
    schedule: "NRSS",
    back: 12,
    forward: 0,
    useDateRange: false,
    autoRefresh: false,
    scheduleOverrideable: true,   // user can switch within 6H-compatible schedules
    note: null,
  },
  "24H": {
    label: "24H",
    schedule: "Interim",
    back: 48,
    forward: 0,
    useDateRange: false,
    autoRefresh: false,
    scheduleOverrideable: true,
    note: null,
  },
  "7D": {
    label: "7D",
    schedule: "Final",
    back: null,
    forward: 0,
    useDateRange: true,           // uses from/to, not back
    autoRefresh: false,
    scheduleOverrideable: false,  // 7D forces Final
    note: "7-day range uses Final prices only",
  },
  CUSTOM: {
    label: "CUSTOM",
    schedule: "Final",
    back: null,
    forward: 0,
    useDateRange: true,
    autoRefresh: false,
    scheduleOverrideable: false,
    note: "Custom range uses Final prices only",
  },
} as const;

export type TimeRange = keyof typeof TIME_RANGE_CONFIG;
```

### Top bar display rules
Show alongside the time range buttons, right-aligned before the refresh icon:
- Current NZ trading period: "TP {n} · {HH:MM}" — calculate from current NZT time
  (each TP is 30 min, TP1 starts at 00:00 NZT, TP48 ends at 24:00)
- Last data refresh: "Updated {n}s ago" or "Updated {n}m ago" — counts up from last fetch
- In LIVE mode: pulsing red dot + "LIVE"
- In non-LIVE mode: no dot, just the timestamp

### Schedule selector in sidebar (for 6H and 24H only)
When `scheduleOverrideable: true`, show a schedule dropdown in the sidebar
filtered to only schedules compatible with the selected time range:
- 6H compatible: RTD, NRSS, PRSS
- 24H compatible: NRSS, NRSL, PRSS, PRSL, Interim

When `scheduleOverrideable: false` (LIVE, 1H, 7D, CUSTOM):
Show the schedule as a greyed-out read-only label with a lock icon and tooltip explaining
why it's fixed. Never hide it entirely — the user should always know what schedule is active.

### CUSTOM mode
When CUSTOM is selected, a compact date range picker appears inline in the top bar
(two date inputs: From / To). Default to last 48 hours. Max range: 30 days.
Validate that `to` is not in the future and `from` is not more than 90 days ago.

---

## 5. Sidebar — Two Separate Configs, Full Guard Rails

The sidebar contents change completely based on which page is active.
Read the active route in `Sidebar.tsx` and render the correct section set.

### NZX WITS Data Sidebar

#### Section: AUTO-REFRESH
Only enabled when time range is LIVE.
When any other time range is selected, show section greyed with tooltip:
"Auto-refresh only available in LIVE mode"
- Toggle: On / Off (default On when LIVE)
- Interval selector (only visible when On): 30s | 1m | 5m

#### Section: NODES
Used by: Latest Price KPIs, RTD Price Map, Spot Prices, RTD vs PRSL
- Multi-select chip list grouped by island:
  NI: OTA2201, HAY2201, WKM2201, STK0111, MRT2201, TAU2201
  SI: BEN2201, ISL2201
- Guard rails:
  - Minimum 1 node required (cannot deselect all)
  - Maximum 6 nodes (7th chip becomes disabled)
  - RTD vs PRSL always uses first selected node only
    (show note: "Overlay uses {firstNode}")
- Apply button at bottom of section (does not live-update — requires Apply)

#### Section: ISLAND FILTER
No Island Filter - remove

#### Section: SCHEDULE
Only visible when time range is 6H or 24H (scheduleOverrideable: true).
Show as greyed read-only locked field for all other time ranges.
- Dropdown filtered to time-range-compatible schedules only (see Section 4)
- When schedule changes, fire `sanitiseOnScheduleChange()` from `scheduleConfig.ts`
  to auto-correct market type if it's no longer valid
- Show a one-line description of the selected schedule below the dropdown
  (pull `description` from `SCHEDULE_CONFIG`)

#### Section: MARKET TYPE
- Toggle: ENERGY | RESERVES
- RESERVES is disabled (greyed, with tooltip) when:
  - Time range is LIVE or 1H (RTD doesn't support Reserves)
  - Time range is 7D or CUSTOM (Final doesn't support Reserves)
  - Active schedule doesn't support Reserves (per `scheduleConfig.ts`)
- Only affects Spot Prices chart — does not affect Row 2 island balance cards
  (those always show energy quantities regardless)

#### APPLY button
Sticky at the bottom of the sidebar.
Sidebar changes are staged — nothing re-fetches until Apply is hit.
Show a yellow dot on the Apply button when there are unapplied changes.
After Apply: close sidebar, trigger refetch on affected widgets only.

---

### COG Properties Sidebar

Completely separate. For now just stub it with two placeholder sections:

#### Section: PROPERTY
- Dropdown: "Select property..." (no options yet, disabled)
- Helper text: "Property data coming soon"

#### Section: DATE RANGE
- From / To date pickers (disabled for now)

No Apply button needed while stubbed.

---

## 6. DashboardContext Updates

Split the context into two separate contexts:

**`WITSContext`** (used by NZX WITS Data page):
```typescript
interface WITSState {
  timeRange: TimeRange;           // "LIVE" | "1H" | "6H" | "24H" | "7D" | "CUSTOM"
  schedule: ScheduleKey;          // derived from timeRange + user override
  marketType: "E" | "R";
  nodes: NodeCode[];              // ["OTA2201", "HAY2201", "BEN2201"]
  island: "NI" | "SI" | "BOTH";
  autoRefresh: boolean;
  refreshInterval: 30 | 60 | 300;
  customFrom?: string;            // ISO, only when CUSTOM
  customTo?: string;
  // Staged (not yet applied)
  staged: Partial<WITSState>;
  hasStagedChanges: boolean;
}
```

**`PropertiesContext`** (used by COG Properties page):
```typescript
interface PropertiesState {
  selectedProperty: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}
```

When `timeRange` changes in WITSContext:
1. Look up the new config in `TIME_RANGE_CONFIG`
2. Override `schedule` with `config.schedule` if `scheduleOverrideable: false`
3. If `scheduleOverrideable: true`, only change schedule if current schedule is
   incompatible with new time range
4. Run `sanitiseOnScheduleChange()` to fix marketType if needed
5. Set `autoRefresh` based on `config.autoRefresh`

---

## 7. Implementation Order — Do In This Sequence

1. Create `src/lib/timeRangeConfig.ts` with the constant above
2. Split `DashboardContext.tsx` into `WITSContext.tsx` + `PropertiesContext.tsx`
3. Update `App.tsx` — rename routes, wrap each page in its own context
4. Update `TopBar.tsx`:
   - Add TP calculator (current NZT trading period number + time)
   - Add "Updated Ns ago" counter
   - Add CUSTOM date range inline picker
   - Lock/unlock schedule display based on `scheduleOverrideable`
5. Update `Sidebar.tsx` — implement the two separate sidebar configs with all guard rails
6. Build Row 2 widgets: `EnergyGeneration.tsx`, `EnergyDemand.tsx`,
   `NIReserves.tsx`, `SIReserves.tsx`
7. Build `RTDPriceMap.tsx` using the SVG coordinates above
8. Update `PriceChart.tsx` (was Spot Prices) to read from WITSContext time range
9. Update `ScheduleOverlay.tsx` (RTD vs PRSL) — add the "only available in LIVE/1H" gate
10. Update `PriceKPIs.tsx` → rename to `NodeTicker.tsx`, implement 3-row TP format
11. Wire Row 1 and Row 3/4 into the NZX WITS Data page grid
12. Stub `COGProperties.tsx` with placeholder card
13. Confirm all guard rails fire correctly before calling done

Confirm each step before moving to the next.
Do not build COG Properties content — stub only.
Do not change any backend files.