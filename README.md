# COG Properties Dashboard

FastAPI + React dashboard for COG Power's solar PPA properties. It shows per-site solar
generation, real-time output, daily/annual yield, grid export, weather, and PPA details,
sourced from the iSolarCloud (Sungrow) inverter API. The FastAPI backend handles the
iSolarCloud OAuth2 flow and all API calls; the React frontend consumes clean JSON from
FastAPI and never contacts iSolarCloud directly. Credentials stay server-side and token
refresh is invisible to the UI.

The backend is **stateless between requests** — the frontend polls on a timer (TanStack Query
`refetchInterval`) and the backend serves each call on demand. There is no background scheduler,
so the app is safe to run on serverless / free-tier hosting that sleeps between requests.
OAuth tokens are persisted to Postgres (Neon) so they survive restarts and ephemeral
filesystems; see [Deploy to Render](#deploy-to-render).

> **Note:** This app previously included an NZX/WITS electricity-market view. That has been
> removed — COG Properties is now the sole dashboard page.

## Local development

**Terminal 1 — Backend**
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
copy .env.example .env         # optional — fill in iSolarCloud keys to enable solar data
uvicorn main:app --reload --port 8001
```
FastAPI: `http://localhost:8001` · Interactive docs: `http://localhost:8001/docs` ·
Health: `http://localhost:8001/api/health`

The backend starts with **no required environment variables**. Without iSolarCloud credentials
the solar endpoints return `503` but the app runs fine.

**Terminal 2 — Frontend**
```bash
cd frontend
npm install
npm run dev
```
React: `http://localhost:5173` (Vite proxies `/api` → `http://localhost:8001`)

## Environment variables

| Variable        | Required | Notes                                                                 |
| --------------- | -------- | --------------------------------------------------------------------- |
| `DATABASE_URL`  | prod     | Postgres (e.g. Neon) for persistent OAuth tokens. Local file if unset.|
| `app_key`       | no       | iSolarCloud. Solar endpoints disabled if any iSolar var is unset.     |
| `secret_key`    | no       | iSolarCloud.                                                          |
| `app_id`        | no       | iSolarCloud.                                                          |
| `redirect_uri`  | no       | iSolarCloud OAuth callback. Must match the deployed URL in prod.      |
| `ISOLAR_SERVER` | no       | Defaults to `Australia`.                                              |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | prod | Google SSO OAuth client. Without them the login route returns `503`. |
| `SESSION_SECRET` | prod    | Signs the session cookie. Ephemeral (sessions reset on restart) if unset. |
| `ALLOWED_DOMAIN` | prod    | Google Workspace domain allowed to sign in (e.g. `cognz.com`).        |
| `ALLOWED_EMAILS` | no      | Optional extra comma-separated allowlist, in addition to the domain.  |
| `PUBLIC_BASE_URL` | prod   | Builds the OAuth redirect URI + sets the cookie Secure flag. `http://localhost:5173` locally. |

See [backend/.env.example](backend/.env.example). The backend reads `.env` locally; in
production set these in the host's dashboard (they are never committed).

## Docker (single container: API + built frontend)

The Dockerfile builds the React frontend and serves it from FastAPI, so the whole app runs as
one service. `/api/*` are the API routes; everything else serves the SPA.

```bash
docker compose up --build
# → http://localhost:8001   (dashboard + API + /api/health)
```

`docker-compose.yml` loads `backend/.env` if present (`required: false`).

## Deploy to Render

The repo includes [render.yaml](render.yaml) (Docker runtime, free plan,
`healthCheckPath: /api/health`). The container binds to Render's injected `$PORT`
automatically.

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, point it at the repo. Render reads `render.yaml`.
3. Set the env vars in the Render dashboard (declared `sync: false`, so Render prompts for
   them): `DATABASE_URL`, and — only if you want solar — `app_key`, `secret_key`, `app_id`,
   `redirect_uri`, `ISOLAR_SERVER`.
4. Deploy. Render builds the Dockerfile and runs the health check against `/api/health`.

### iSolarCloud OAuth (initial setup and new plants)

iSolarCloud uses an OAuth2 authorization-code flow. Initial setup needs browser consent;
repeat the consent flow when the dashboard needs access to newly added plants. A plant
being visible in the same iSolarCloud account does **not** automatically add it to an
existing app authorization.

1. Set `redirect_uri` to `https://<your-render-url>/api/solar/auth/callback` and register that
   **exact** URL with iSolarCloud (it must match character-for-character).
2. Sign in to the deployed dashboard, open `https://<your-render-url>/api/solar/auth/url`,
   and open the `url` from its JSON response in the same browser. Confirm the consent page
   names the intended dashboard application and iSolarCloud account.
3. Select **all** plants the dashboard should keep using, including existing plants and the
   new ones, then approve the required API permissions. Do not revoke the old authorization
   as a troubleshooting shortcut.
4. The redirect to `/api/solar/auth/callback` should display
   `Authorised. Tokens saved — solar endpoints are now active.` The server exchanges the
   code and replaces its stored tokens. Do not share consent URLs, callback URLs containing
   a `code`, or tokens in issues, logs, or chat.
5. Check iSolarCloud **Account and security → Authorization management → current COG
   Dashboard authorization → Authorization details** to confirm the intended plants are
   authorized. Then verify the deployed dashboard's live data as described below.
   `/api/solar/auth/status` returning `{"authorised": true}` confirms stored tokens,
   **not** which plants were granted.

Tokens are stored in Postgres (`DATABASE_URL`), so they survive restarts and redeploys.

### Add a dashboard property

1. Confirm the plant ID (`ps_id`) and inverter serial in iSolarCloud, and gather the site
   address, installed capacity, panel/inverter specifications, weather location, and PPA
   terms from their respective source records. Mark estimates with the existing
   `*_estimated` fields; do not treat an estimated annual target or an unconfirmed PPA
   rate as an invoice-ready fact.
2. Copy a comparable file in [`frontend/src/data/properties/`](frontend/src/data/properties/)
   and set a unique `id`, `name`, address, coordinates, `system`, `contract`, `weather`,
   and `solar_ps_id`. Follow [`frontend/src/types/property.ts`](frontend/src/types/property.ts)
   for the supported fields. Register the new JSON import and ID in
   [`frontend/src/hooks/useProperty.ts`](frontend/src/hooks/useProperty.ts). This registry
   controls which properties appear in the UI.
3. Run `npm run build` from `frontend/` and
   `python -m unittest discover -s tests -v` from `backend/`, then submit the change on
   a feature branch for review. After merging, confirm Render deployed the merge and
   that the new property appears on the production dashboard. An appearance with `—`
   for live values only proves the frontend config deployed; it does not prove API access.
4. Re-run the [iSolarCloud OAuth flow](#isolarcloud-oauth-initial-setup-and-new-plants),
   selecting **existing and new** plants. This is needed when the current app grant does
   not include the new plant, even if the same account can view it in iSolarCloud.
5. While signed in, check `/api/solar/plants/<ps_id>/devices` and
   `/api/solar/plants/<ps_id>/realtime` for the new plant, then refresh the dashboard and
   confirm its inverter, current output, and today's yield populate. Spot-check an older
   property too. At night, zero output can be normal; a `503` or persistent `—` is not
   proof of a healthy connection.

The backend's `/api/solar/plants/{plant_id}/...` routes accept any authorized plant ID;
there is no per-property backend ID list to edit. `/api/solar/plants` is an account-listing
endpoint, not the frontend registry, and its default iSolarCloud list filter can omit some
plants. Check the authorization details and direct per-plant endpoints when diagnosing a
missing site. For example, `getDeviceListByPsId` returning `result_code=1` with null
`result_data` produced a `503` for schools that were visible in the account but absent
from the app's earlier grant. Reauthorizing the app for all sites restored their live data.

### Google SSO (gates the whole dashboard)

A Google sign-in screen sits in front of the app. Only verified accounts in the
COG Google Workspace domain (`ALLOWED_DOMAIN`, e.g. `cognz.com`) can reach the
dashboard or its data APIs; everyone else sees only the login page. The backend
runs the OAuth2/OIDC flow (the browser never holds the client secret) and stores a
signed session cookie — there is no session table.

**Google Cloud Console (one-time)**

1. **APIs & Services → OAuth consent screen** → **Internal** (COG Workspace), so
   Google auto-restricts sign-in to the org.
2. **Credentials → Create OAuth client ID → Web application.**
3. **Authorized redirect URIs** (must match character-for-character):
   - `https://cog-dashboard.onrender.com/api/auth/google/callback`
   - `http://localhost:5173/api/auth/google/callback` (local dev)
4. Copy the client ID + secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

**Endpoints** — `GET /api/auth/google/login` (start), `GET /api/auth/google/callback`
(verify + set session), `GET /api/auth/me` (current user or `401`),
`POST /api/auth/logout`. These and `/api/health` are public; all `/api/solar/*`
routes require a valid session (`401` otherwise).

Locally, set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_DOMAIN=cognz.com`
in `backend/.env` and sign in via Vite at `http://localhost:5173`.

**Notes for the free tier**
- The instance spins down after ~15 min idle; the next request incurs a cold start (~1 min).
- Without `DATABASE_URL`, OAuth tokens fall back to `backend/token_store.json`, which is
  **not** persisted on Render's ephemeral filesystem — so set `DATABASE_URL` in production.
