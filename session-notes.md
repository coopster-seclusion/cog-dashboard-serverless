# Session Notes — COG Dashboard v2

---

## Completed: iSolarCloud Backend Integration (May 2026)

### What was built

Full iSolarCloud API service wired into the FastAPI backend.

**Backend restructure** — flat files replaced with a proper package layout:
```
backend/
├── main.py
├── dependencies.py
├── routers/        wits.py + isolar_cloud.py
├── services/       wits_client.py + isolar_cloud.py
├── models/         wits.py + isolar_cloud.py
└── token_store.json
```

**`services/isolar_cloud.py`**
- OAuth2 Authorization Code flow (app configured with "Authorize with OAuth2.0: Yes")
- `auth_url()` → consent URL for browser
- `exchange_code(code)` → trades auth code for access + refresh tokens
- Tokens persist to `token_store.json`, auto-refresh on expiry
- All API calls: `POST` with `x-access-key: secret_key` + `Authorization: Bearer <token>`
- Gateway: `https://augateway.isolarcloud.com` (Australia — correct for NZ)

**`routers/isolar_cloud.py`** — prefix `/api/solar/`
- `GET /auth/url` — returns consent URL
- `GET /auth/callback` — catches OAuth2 redirect, saves tokens
- `GET /auth/status` — `{"authorised": true/false}`
- `GET /plants` — all plants for the account
- `GET /plants/{id}/realtime` — 13 live data points, 5-min cadence
- `GET /plants/{id}/history` — minute-resolution history with configurable interval

**Confirmed live plants:**

| ps_id | Name | Live power (at setup) |
|---|---|---|
| 1687012 | Hornby High School | 16.7 kW |
| 1685973 | Manurewa Rural Campus | 5.5 kW |
| 1685943 | Manurewa Intermediate — Gymnasium | 7.7 kW |
| 1685938 | Manurewa Intermediate — Main Building | 0 W |
| 1624093 | Aquatic Centre | 29.8 kW |

**Realtime data points returned per plant:**
`power`, `daily_yield`, `total_yield`, `load_power`, `meter_ac_power`,
`feed_in_energy_today`, `energy_purchased_today`, `pcs_total_active_power`,
`battery_soc`, `daily_battery_charge`, `daily_battery_discharge`,
`ambient_temperature`, `irradiance`

Note: load/grid/battery points are `null` on PV-only sites (no meter/battery installed).

### Auth path taken

- App configured as "Authorize with OAuth2.0: **Yes**" in developer portal
- `app_id=1266`, `redirect_uri=http://localhost:8000/api/solar/auth/callback`
- Session login approach (OAuth2.0: No) was investigated first — rejected because
  `/openapi/platform/` endpoints only accept OAuth2 Bearer tokens, not session tokens
- OAuth2 flow completed once; tokens in `token_store.json`

### .env variables for iSolarCloud

```
app_key=6EC3A94D6F21D03CA225D5CAD013771A
secret_key=<hidden>
app_id=1266
redirect_uri=http://localhost:8000/api/solar/auth/callback
ISOLAR_SERVER=Australia
```

---

## Completed: School Consumption + Grid Export Widgets (prior session)

See `dashboard_project.md` widget roadmap. Built:
- `src/lib/schoolLoadProfile.ts` — simulation engine (demand profile, export/import calc)
- `src/components/widgets/SchoolConsumption.tsx` — dual-line chart (demand vs generation)
- `src/components/widgets/GridExport.tsx` — grouped bar + flow diagram
- Both inserted into `COGProperties.tsx` as Row 2.5
- All values clearly labeled ESTIMATED, connection notice on both cards

---

## Next Steps — Solar Widgets (frontend)

Now that the iSolarCloud backend is live, replace the estimated simulation widgets
with real inverter data from the API.

### Suggested next session scope

**1. `useSolar` hooks** (`src/hooks/useSolar.ts`)
- `useSolarPlants()` — `GET /api/solar/plants`, static/cached
- `useSolarRealtime(plantId)` — `GET /api/solar/plants/{id}/realtime`, poll every 5 min
- `useSolarHistory(plantId, start, end, interval)` — `GET /api/solar/plants/{id}/history`

**2. Replace `SchoolConsumption.tsx` simulation** with live `power` point from realtime API
- Keep the demand profile model for load (no meter installed on these sites)
- Replace estimated generation line with `power` from iSolarCloud realtime

**3. Replace `GridExport.tsx` simulation** with live data where available
- `power` for generation
- `load_power` (null on current sites — keep modeled load as fallback)
- `meter_ac_power` for grid exchange (null on current sites — keep calculated fallback)

**4. New widget: `SolarFleet.tsx`**
- Summary card showing all 5 plants in one view
- Total fleet power (sum of all `power` values)
- Per-plant mini-bar showing current output vs installed capacity
- Total daily yield across fleet
- Poll every 5 min

**5. Property-to-plant mapping**
- Add `isolar_plant_id` field to each property JSON (e.g. Hornby = `"1687012"`)
- `COGProperties.tsx` reads this and passes to `useSolarRealtime()`
- Widget shows real data when plant ID is present, falls back to estimated when null

### Notes for next session
- iSolarCloud data refreshes every 5 minutes — no point polling faster
- `point_name` fields from API return Chinese text regardless of `lang` param — ignore them, use our own labels
- `null` values on points mean the sensor/device isn't installed — handle gracefully
- Historical endpoint uses `YYYYMMDDHHMMSS` format for start/end timestamps
