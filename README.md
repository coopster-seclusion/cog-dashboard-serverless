# NZ Electricity Market Dashboard

FastAPI + React dashboard for live New Zealand electricity market data via the WITS API
(electricityinfo.co.nz). The FastAPI backend handles OAuth2 authentication and all WITS API
calls; the React frontend consumes clean JSON from FastAPI and never contacts WITS directly.
Credentials stay server-side, token refresh is invisible to the UI, and React can poll on a
timer without re-authenticating.

The backend is **stateless** — every request fetches live data from the upstream APIs, and the
frontend polls on a timer (TanStack Query `refetchInterval`). There is no background scheduler
and no server-side cache, so the app is safe to run on serverless / free-tier hosting that
sleeps between requests.

## Local development

**Terminal 1 — Backend**
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
copy .env.example .env         # then fill in WITS_CLIENT_ID + WITS_CLIENT_SECRET
uvicorn main:app --reload --port 8001
```
FastAPI: `http://localhost:8001` · Interactive docs: `http://localhost:8001/docs` ·
Health: `http://localhost:8001/api/health`

**Terminal 2 — Frontend**
```bash
cd frontend
npm install
npm run dev
```
React: `http://localhost:5173` (Vite proxies `/api` → `http://localhost:8001`)

## Environment variables

| Variable             | Required | Notes                                                            |
| -------------------- | -------- | ---------------------------------------------------------------- |
| `WITS_CLIENT_ID`     | yes      | WITS OAuth2 client credentials. App refuses to start without it. |
| `WITS_CLIENT_SECRET` | yes      | WITS OAuth2 client credentials.                                  |
| `app_key`            | no       | iSolarCloud. Solar endpoints disabled if any iSolar var is unset.|
| `secret_key`         | no       | iSolarCloud.                                                     |
| `app_id`             | no       | iSolarCloud.                                                     |
| `redirect_uri`       | no       | iSolarCloud OAuth callback. Must match the deployed URL in prod. |
| `ISOLAR_SERVER`      | no       | Defaults to `Australia`.                                         |

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
3. Set the secret env vars in the Render dashboard (they are declared `sync: false`, so Render
   prompts for them): `WITS_CLIENT_ID`, `WITS_CLIENT_SECRET`, and — only if you want solar —
   `app_key`, `secret_key`, `app_id`, `redirect_uri`, `ISOLAR_SERVER`.
4. Deploy. Render builds the Dockerfile and runs the health check against `/api/health`.

**Notes for the free tier**
- The instance spins down after ~15 min idle; the next request incurs a cold start (~1 min).
- The filesystem is ephemeral — `backend/token_store.json` does **not** persist across deploys
  or restarts, so iSolarCloud must be re-authorised after each. WITS is unaffected (it uses
  client-credentials and needs no stored token).
- For iSolarCloud OAuth in production, set `redirect_uri` to
  `https://<your-render-url>/api/solar/auth/callback` and register that URL with iSolarCloud.
