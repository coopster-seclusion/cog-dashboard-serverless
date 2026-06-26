# Session Notes — COG Dashboard

> Planning for the **next** session. Updated 2026-06-26.

---

## ✅ Done: Google SSO (auth gate in front of the dashboard)

Shipped and verified working locally. A Google sign-in screen now sits in front
of the whole app; only verified `cognz.com` Workspace accounts reach the dashboard
or its data APIs.

### What shipped

**Backend** (backend-mediated OIDC — browser never holds the client secret)
- `routers/auth.py` — Authlib Google OIDC flow:
  `GET /api/auth/google/login` → `GET /api/auth/google/callback` (verifies ID
  token, checks allowlist, sets session) → `GET /api/auth/me` → `POST /api/auth/logout`.
- `dependencies.require_user` — 401 if no session.
- `main.py` — `SessionMiddleware` (signed cookie, `SameSite=Lax`, `Secure` auto-on
  for https, **7-day** expiry). Auth router public; **whole `/api/solar/*` router
  gated** with `require_user`; `/api/health` stays public for Render.
- `requirements.txt` — added `authlib`, `itsdangerous`, `httpx`.

**Frontend**
- `context/AuthContext.tsx` — polls `/api/auth/me`; exposes `user` /
  `isAuthenticated` / `logout`.
- `pages/Login.tsx` — branded dark login with one "Sign in with Google" button;
  shows `?error=unauthorized`.
- `App.tsx` — route guard: spinner while loading → `<Login/>` if unauthenticated →
  dashboard (data queries only mount once authed).
- `TopBar.tsx` — avatar + email + Sign out.

**Config** — `.env.example`, `render.yaml` (`SESSION_SECRET` via `generateValue`,
`ALLOWED_DOMAIN=cognz.com`, `PUBLIC_BASE_URL`), README "Google SSO" section.

### Access control

The gate is the **verified email domain** (`ALLOWED_DOMAIN=cognz.com`), with the
Workspace `hd` claim logged as corroboration. `ALLOWED_EMAILS` is an optional extra
allowlist. **Fails closed**: if neither is set, nobody can sign in.

### Still TODO before prod use

- Register the **prod** redirect URI in Google Cloud Console:
  `https://cog-dashboard.onrender.com/api/auth/google/callback` (the localhost one
  is already done).
- Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in the Render dashboard
  (the other SSO vars are in `render.yaml`).
- Deploy + smoke test the live sign-in.

### Design note (revisit if it bites)

Gating the **entire** solar router means the iSolarCloud OAuth *setup* endpoints
(`/api/solar/auth/*`) now also require a COG session. That's stricter (good) and
the iSolar callback still works because the admin's browser carries the `Lax`
session cookie on the redirect. If we ever need those iSolar setup routes reachable
without a session, move the `require_user` dependency onto the data routes only.

---

## Next session: Make the dashboard mobile-friendly

### Goal

The app is currently **desktop-only** — no `md:`/`sm:` breakpoints anywhere, a hard
12-column grid, and a very dense property header. On a phone (~375px) widgets
collapse to unusable slivers. Make the dashboard usable and legible on phones and
tablets without redesigning the desktop view.

### Where we're starting from (audited)

- `index.html` already has `<meta name="viewport" content="width=device-width, initial-scale=1.0">`. ✅
- Charts use Nivo `Responsive*` (width adapts to container) with a fixed `height: 220`. Width is fine; **x-axis tick density** is the risk on narrow screens.
- Sidebar is already an off-canvas drawer (`fixed`, `w-64`, `translate-x`, overlay) — good mobile pattern **but nothing opens it** (see bug below).

### Primary blockers (in priority order)

1. **The 12-column grid** — `pages/COGProperties.tsx` uses
   `grid grid-cols-12 gap-3 p-4` and every widget has a fixed `colSpan` (3/3/6/7/5/4/3/2).
   `WidgetCard` maps `colSpan` → a fixed `col-span-N` at all sizes.
   **Fix:** make it responsive. Container → `grid-cols-1 md:grid-cols-12`. Change
   `WidgetCard` so `colSpan` only applies at `md:` (`md:col-span-N`); on mobile each
   card is full-width (single column). Add an explicit `md:col-span-*` lookup map so
   Tailwind JIT emits the classes (same reason the current `COL_SPAN` map is explicit).
   Consider an intermediate `sm:`/`lg:` tier (e.g. 2-up on small tablets) only if it
   reads well — single-column mobile is the must-have.

2. **`PropertyHeader.tsx`** — densest component: 3-col grid (`1fr auto 1fr`) packing
   name+address+badge, three center StatPills (System/Panels/Inverters), and a heavy
   right block (LastUpdated + per-inverter status list + two LiveStats + chevron).
   Overflows hard on mobile.
   **Fix:** restructure for small screens — keep **name + "Now" power + chevron** on
   the top row; `hidden md:flex` the center StatPills and the LastUpdated/inverter
   block (or move the pills into the expanded body on mobile). Let the right block
   wrap instead of using the fixed `width: 176`/`minWidth: 72` desktop widths.

3. **Missing hamburger / menu button (bug)** — `TopBar` receives `onMenuToggle` but
   **ignores it** (`onMenuToggle: _`) and renders no button, so the Sidebar (property
   selector + weather refresh) can't be opened at all, on any screen size. On mobile
   the property selector is essential.
   **Fix:** add a hamburger button in `TopBar` wired to `onMenuToggle` (show always,
   or `md:hidden` if we later add a persistent desktop sidebar). Verify the existing
   overlay/close flow.

### Secondary polish

- **Touch targets**: period toggle (Day/Week/Month), the property `<select>`, and the
  weather refresh button should be ≥40px tall on mobile. Header rows are already tappable.
- **Chart axis density**: reduce x-axis tick count on narrow widths (the day view has
  many time labels) to avoid overlap; check the HTML legends in `GridExport.tsx` /
  `SchoolConsumption.tsx` wrap rather than overflow.
- **Horizontal-overflow audit**: hunt fixed pixel widths and `font-mono`/`whitespace-nowrap`
  runs (PropertyHeader's 176px block, StatPills) — ensure no horizontal scroll at 360px.
- **TopBar**: email is already `hidden sm:inline`; keep avatar + Sign out visible.

### Implementation order

1. Fix the menu button in `TopBar` (unblocks the sidebar everywhere). Quick win.
2. Responsive grid: `COGProperties` container + `WidgetCard` `md:col-span-*` map.
3. Responsive `PropertyHeader` (the biggest visual lift).
4. Touch targets + chart tick density + legend wrapping.
5. Horizontal-overflow pass at 360/390px.
6. Test in Chrome DevTools responsive (360 / 390 / 768, portrait + landscape).

### Watch-outs

- Keep the desktop layout pixel-identical at `md:`+ — these are additive breakpoints,
  not a redesign.
- `WidgetCard`'s explicit class map exists because Tailwind JIT can't see dynamically
  built class strings — extend it the same way for the `md:` variants.
- The dashboard only mounts after auth now (route guard), so test mobile **signed in**.

---

## Security cleanup carried over

The original contents of this file (now deleted) contained a live iSolarCloud
`app_key` in plaintext, and `backend/token_store.json` (with OAuth tokens) is still
present in **git history**. If the repo is/becomes public, rotate the iSolarCloud
credentials. Going forward, secrets live only in `.env` (gitignored) and the Render
dashboard.
