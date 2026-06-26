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

### iSolarCloud OAuth (one-time, in production)

iSolarCloud uses an OAuth2 authorization-code flow that needs a one-time browser consent:

1. Set `redirect_uri` to `https://<your-render-url>/api/solar/auth/callback` and register that
   **exact** URL with iSolarCloud (it must match character-for-character).
2. Open `https://<your-render-url>/api/solar/auth/url`, then open the returned consent URL in a
   browser and approve.
3. You'll be redirected to the callback; the server exchanges the code and saves tokens.
4. Verify with `https://<your-render-url>/api/solar/auth/status` → `{"authorised": true}`.

Tokens are stored in Postgres (`DATABASE_URL`), so they survive restarts and redeploys.

**Notes for the free tier**
- The instance spins down after ~15 min idle; the next request incurs a cold start (~1 min).
- Without `DATABASE_URL`, OAuth tokens fall back to `backend/token_store.json`, which is
  **not** persisted on Render's ephemeral filesystem — so set `DATABASE_URL` in production.
