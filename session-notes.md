# Session Prompt — School Consumption + Grid Export Cards
# Addendum to COG Properties page — same session or new session

Attach these files when sending:
- `src/pages/COGProperties.tsx`
- `src/types/property.ts`
- `src/hooks/useWeather.ts`
- `src/data/properties/hornby-high-school.json`
- Any existing widget files from the COG Properties build

Do NOT touch NZX WITS Data page or any backend files.
Same Tesla dark theme, same WidgetCard component, same EstimatedBadge pattern.

---

## Context

No inverter API is connected. All consumption and export figures are simulated using:
- A modeled school load profile (typical NZ secondary school)
- Estimated generation already built in `EstimatedOutput.tsx`
- Grid export = generation - consumption (floored at 0)

Both cards carry the ESTIMATED badge and a persistent connection notice.
The goal is a compelling demo that is clearly labeled as estimated throughout.

---

## 1. School Load Profile Model

Create `src/lib/schoolLoadProfile.ts`

This is the simulation engine. Everything both cards read from.

```typescript
// Typical NZ secondary school daily consumption profile
// Values are kW demand at each hour (0–23)
// Based on ~1,000 kWh/day average on a school day

export type DayType = "weekday" | "weekend" | "holiday";

// Hourly demand profile in kW
const WEEKDAY_PROFILE: number[] = [
  15,  // 00:00 — base load (security, servers, refrigeration)
  15,  // 01:00
  15,  // 02:00
  15,  // 03:00
  15,  // 04:00
  20,  // 05:00 — early HVAC startup
  45,  // 06:00 — HVAC ramp, early staff
  120, // 07:00 — staff arrival, classrooms opening
  180, // 08:00 — peak morning (all rooms, kitchen, labs)
  175, // 09:00 — full school in session
  170, // 10:00
  165, // 11:00
  185, // 12:00 — lunch peak (kitchen, canteen)
  175, // 13:00 — afternoon session
  160, // 14:00
  120, // 15:00 — student departure begins
  80,  // 16:00 — staff remaining, sports
  55,  // 17:00 — wind-down
  35,  // 18:00
  25,  // 19:00
  20,  // 20:00
  18,  // 21:00
  16,  // 22:00
  15,  // 23:00
];

const WEEKEND_PROFILE: number[] = [
  12, 12, 12, 12, 12, 12,   // 00–05 — minimal base load
  12, 15, 20, 25, 25, 25,   // 06–11 — occasional weekend use
  25, 22, 20, 18, 15, 14,   // 12–17
  13, 12, 12, 12, 12, 12,   // 18–23
];

// Daily kWh totals for reference:
// Weekday: ~1,048 kWh
// Weekend: ~386 kWh

export function getDayType(date: Date): DayType {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

export function getHourlyDemandProfile(date: Date): number[] {
  const dayType = getDayType(date);
  return dayType === "weekday" ? WEEKDAY_PROFILE : WEEKEND_PROFILE;
}

export function getCurrentDemandKW(date: Date): number {
  const profile = getHourlyDemandProfile(date);
  const hour = date.getHours();
  const nextHour = (hour + 1) % 24;
  const minuteFraction = date.getMinutes() / 60;
  // Interpolate between current and next hour for a smoother value
  return profile[hour] + (profile[nextHour] - profile[hour]) * minuteFraction;
}

export function getDailyConsumptionKWh(date: Date): number {
  return getHourlyDemandProfile(date).reduce((sum, kw) => sum + kw, 0);
}

// Grid export calculation
// Returns 0 if consumption > generation (importing from grid)
export function getGridExportKW(generationKW: number, consumptionKW: number): number {
  return Math.max(0, generationKW - consumptionKW);
}

// Grid import calculation
// Returns 0 if generation > consumption (exporting to grid)
export function getGridImportKW(generationKW: number, consumptionKW: number): number {
  return Math.max(0, consumptionKW - generationKW);
}

// 24-hour rolling export total in kWh
// Takes hourly generation array and hourly demand profile
export function get24hExportKWh(
  hourlyGenerationKW: number[],  // 24 values from estimateKW per hour
  demandProfile: number[]         // 24 values from getHourlyDemandProfile
): number {
  return hourlyGenerationKW.reduce((sum, genKW, hour) => {
    const exportKW = getGridExportKW(genKW, demandProfile[hour]);
    return sum + exportKW;
  }, 0);
}

// 24-hour rolling consumption total in kWh
export function get24hConsumptionKWh(demandProfile: number[]): number {
  return demandProfile.reduce((sum, kw) => sum + kw, 0);
}

// Self-consumption ratio: % of solar generation used on-site
export function getSelfConsumptionRatio(
  hourlyGenerationKW: number[],
  demandProfile: number[]
): number {
  const totalGeneration = hourlyGenerationKW.reduce((s, v) => s + v, 0);
  if (totalGeneration === 0) return 0;
  const selfConsumed = hourlyGenerationKW.reduce((sum, genKW, hour) => {
    return sum + Math.min(genKW, demandProfile[hour]);
  }, 0);
  return (selfConsumed / totalGeneration) * 100;
}
```

### Add to `hornby-high-school.json`

Add this field to the property JSON under `system`:
```json
"daily_consumption_kwh_estimate": 1000,
"consumption_profile": "nz_secondary_school"
```

---

## 2. SchoolConsumption.tsx Widget

Location: `src/components/widgets/SchoolConsumption.tsx`

### Layout

WidgetCard, title "School Consumption", col span: 6 (half page width)
EstimatedBadge in card header — always visible.

**Top row — three stat pills inline:**
- Current Demand: `{kW}` kW (Inter Mono, white, large)
- Today's Total: `{kWh}` kWh (updates as day progresses)
- Day Type: "WEEKDAY" or "WEEKEND" (cyan badge)

**Middle — Nivo line chart (primary):**
- 24-hour consumption profile for today
- X-axis: hours (show 06:00–22:00, compress overnight)
- Y-axis: kW (0 to 200)
- Two lines on the same chart:
  - School demand: `#FF8C00` orange (same as NI color convention)
  - Solar generation: Tesla red `#E31937` (from hourly GHI estimate)
- Fill the area BETWEEN the two lines:
  - When demand > generation: `rgba(255, 140, 0, 0.15)` — importing from grid
  - When generation > demand: `rgba(227, 25, 55, 0.15)` — exporting to grid
- Vertical dashed line at current hour (white, 60% opacity)
- Legend below chart: "Demand" (orange) | "Generation" (red)

**Bottom — connection notice:**
Small text, `#505050`, italic:
"Live consumption data requires inverter API connection.
Demand profile modeled on NZ secondary school baseline."

### Data sources:
- Demand: `getHourlyDemandProfile(today)` for the chart
- Current demand: `getCurrentDemandKW(now)` for the stat pill
- Generation: `hourly.shortwave_radiation` × `estimateKW()` (already in WeatherNow)

---

## 3. GridExport.tsx Widget

Location: `src/components/widgets/GridExport.tsx`

### Layout

WidgetCard, title "Grid Export", col span: 6 (half page width, beside SchoolConsumption)
EstimatedBadge in card header — always visible.

**Top row — four stat pills inline:**

- **Currently Exporting:** `{kW}` kW
  Color: Tesla red when > 0, `#505050` muted when 0
  Sub-label: "to grid" or "importing from grid" depending on state

- **Currently Importing:** `{kW}` kW
  Only show this value when consumption > generation
  Color: `#FF8C00` orange when importing

- **24h Export Total:** `{kWh}` kWh
  Running total for the current day so far

- **Self-Consumption:** `{%}` %
  % of solar generation used on-site (not exported)

**Middle — Nivo bar chart:**
- Grouped hourly bars for today, hours 06:00–20:00
- Two bars per hour group:
  - Export to grid: Tesla red `#E31937`
  - Import from grid: `#FF8C00` orange
- Hours where no solar and demand is met from grid only:
  Show import bar only, no export bar
- Y-axis: kW
- Add a "NET ZERO" reference line at 0 kW

**Flow indicator (below chart, above notice):**
Visual left-to-right flow diagram — simple, no animation needed:
```
[SOLAR ARRAY]  →  [SCHOOL]  →  [GRID]
   203.4 kW       {demand}    {export}
```
Three boxes connected by arrows.
Box colors: red (solar) | orange (school) | cyan (grid)
Arrow shows direction: right when exporting, left when importing.
When importing, the GRID box arrow points LEFT into SCHOOL.

**Bottom — connection notice:**
Same disclaimer text as SchoolConsumption.tsx.

### Data sources:
- `getGridExportKW(currentGenKW, currentDemandKW)` for current export pill
- `getGridImportKW(currentGenKW, currentDemandKW)` for current import pill
- `get24hExportKWh(hourlyGen, demandProfile)` for 24h total
- `getSelfConsumptionRatio(hourlyGen, demandProfile)` for self-consumption %

---

## 4. Grid Placement in COGProperties.tsx

Add a new row to the existing grid, below the GenerationChart / SolarIrradianceChart row
and above the SystemStats / PPADetails / WeatherForecast row:

```
Row 2.5 (new row):
  SchoolConsumption    col 1–6
  GridExport           col 7–12
```

This puts the consumption/export context immediately after generation data,
before the static system specs — which is the right reading order for someone
trying to understand the site's energy balance.

---

## 5. State — No New Context Needed

Both widgets derive everything from:
- `useWeather()` hook (already exists — hourly GHI)
- `schoolLoadProfile.ts` functions (pure, no async)
- `property` from `PropertiesContext` (already exists)

No new API calls. No new context. Just two new widgets + one new lib file.

---

## 6. Implementation Order

1. Create `src/lib/schoolLoadProfile.ts` — full file as above
2. Update `hornby-high-school.json` — add consumption estimate fields
3. Build `SchoolConsumption.tsx` — stat pills + dual-line chart
4. Build `GridExport.tsx` — stat pills + grouped bar chart + flow diagram
5. Insert both widgets into `COGProperties.tsx` as Row 2.5
6. Verify the flow diagram arrow direction flips correctly between
   export and import states (test by checking a nighttime hour where
   generation = 0 and the school is fully importing)
7. Confirm EstimatedBadge and connection notice appear on both cards

Stop after Step 7. Do not add anything else to this page in this session.