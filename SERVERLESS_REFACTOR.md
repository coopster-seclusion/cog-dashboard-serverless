# COG Dashboard: Serverless Refactor Session Prompt

You are helping refactor the COG Power solar dashboard from an always-on architecture to a serverless-compatible architecture. This file is your complete brief. Read it fully before writing any code.

---

## Context: what exists right now

This is a working local dashboard for a New Zealand solar PPA operator called COG Power. It monitors solar generation across 7-11 sites, displays NZ electricity market data (WITS), and tracks financial performance. It runs on `localhost` in development.

### Current stack

**Backend** (`backend/`):
- Python 3.x, FastAPI on port 8001 (not 8000 -- WSL2 proxy conflict)
- Uvicorn ASGI server
- APScheduler runs INSIDE the FastAPI process via the `lifespan` context manager
- APScheduler polls external APIs every 5 minutes and stores results in-memory (Python dicts/objects)
- Two API clients in `services/`:
  - `wits_client.py` -- WITS electricity market API (OAuth2 client credentials)
  - `isolar_cloud.py` -- iSolarCloud/Sungrow inverter API (OAuth2 authorization code)
- Routes in `routers/`:
  - `wits.py` -- all `/api/*` WITS market data routes
  - `isolar_cloud.py` -- all `/api/solar/*` inverter data routes
- `dependencies.py` -- shared FastAPI dependencies (`get_wits_client`, `get_isolar_client`)
- `models/` -- Pydantic response models
- `.env` file for credentials (WITS_CLIENT_ID, WITS_CLIENT_SECRET, iSolarCloud keys)
- `token_store.json` -- persisted iSolarCloud OAuth2 tokens

**Frontend** (`frontend/`):
- React 18, Vite, TypeScript
- TanStack Query v5 (caching + 5-min polling via `refetchInterval`)
- Nivo charts (@nivo/core, @nivo/line, @nivo/bar, @nivo/bump, @nivo/pie, @nivo/scatterplot)
- shadcn/ui (Radix primitives), Tailwind CSS v3, React Router v6, lucide-react
- Vite proxies `/api` -> `http://localhost:8001`

**State**: In-memory only. No database. No persistent storage beyond `token_store.json`.

**Architecture flow**:
```
Browser (React) --> FastAPI (localhost:8001) --> WITS API
                                            --> iSolarCloud API
                                            --> Open-Meteo API
```

APScheduler (inside FastAPI process) polls these APIs every 5 minutes and caches responses in Python dicts. The FastAPI route handlers read from these cached dicts and return JSON to the frontend.

---

## Objective: what we are building

We are refactoring this codebase so it can run on serverless/free-tier hosting (specifically Render free tier for the backend, Cloudflare Pages for the frontend later, Neon DB for persistence later). The critical change is removing APScheduler and replacing it with a cron-triggered HTTP endpoint.

### The architectural shift

**Before (always-on)**:
```
APScheduler (background thread) --[every 5 min]--> fetch APIs --> store in memory
FastAPI routes --> read from memory --> return JSON
```

**After (serverless-compatible)**:
```
External cron (GitHub Actions) --[every 5 min]--> POST /api/cron/refresh
/api/cron/refresh handler --> fetch APIs --> store in cache/DB
FastAPI routes --> read from cache/DB --> return JSON
```

The backend becomes stateless between requests. It wakes up, serves a request (either a cron refresh or a dashboard API call), and can go back to sleep.

---

## Constraints: what NOT to change

1. **DO NOT touch the frontend.** Zero changes to anything in `frontend/`. The React app, TanStack Query hooks, Vite config, component structure, styling -- all of it stays exactly as-is. The frontend already polls via TanStack Query `refetchInterval`, which is the correct pattern for this architecture.

2. **DO NOT change the API route signatures.** Every existing route in `routers/wits.py` and `routers/isolar_cloud.py` must continue to serve the exact same JSON shape at the exact same URL paths. The frontend depends on these contracts.

3. **DO NOT change the API client logic.** `wits_client.py` and `isolar_cloud.py` contain working OAuth2 flows and API call logic. These are correct. We are only changing WHERE and WHEN they get called, not HOW.

4. **DO NOT add a database yet.** Phase 1 keeps in-memory state. We will add Neon DB persistence in a later phase. For now, the cron endpoint refreshes in-memory state, and if the process restarts, the next cron run repopulates it.

5. **DO NOT remove or rename existing files** unless they are APScheduler-specific configuration files.

---

## Implementation plan

Work through these steps in order. After each step, STOP and confirm with me before proceeding to the next. Do not batch steps or skip ahead.

### Step 1: Understand the current APScheduler setup

Before changing anything, read and summarize:
1. `backend/main.py` -- find the `lifespan` function or startup event where APScheduler is initialized
2. Identify every scheduled job: what function does it call, at what interval, and what data does it cache
3. Identify the in-memory data structures where cached API responses are stored (these are probably module-level dicts or a shared state object)
4. List all imports related to APScheduler (`apscheduler`, `BackgroundScheduler`, `AsyncIOScheduler`, etc.)

**Output**: A summary of exactly what APScheduler does, formatted as:
```
Job 1: calls `function_name()` every X minutes
  - Fetches: [what external API endpoint]
  - Stores result in: [variable/dict name in which module]
  
Job 2: ...
```

**STOP after this step. I will confirm before you proceed.**

---

### Step 2: Create the cron refresh endpoint

Create a new router file: `backend/routers/cron.py`

This router exposes a single endpoint:
```
POST /api/cron/refresh
```

This endpoint must:
1. Call the exact same functions that APScheduler was calling on its schedule
2. Populate the exact same in-memory data structures
3. Return a JSON response with a summary of what was refreshed and whether each source succeeded or failed
4. Include basic timing (how long the refresh took)
5. Be protected by a simple shared secret via a query parameter or header (e.g., `Authorization: Bearer <CRON_SECRET>` where CRON_SECRET is from `.env`). This prevents random internet traffic from triggering expensive API calls.

Example response:
```json
{
  "status": "ok",
  "refreshed_at": "2026-06-26T12:00:00Z",
  "duration_ms": 1423,
  "sources": {
    "wits_prices": {"status": "ok", "records": 48},
    "wits_quantities": {"status": "ok", "records": 96},
    "isolar_devices": {"status": "ok", "sites": 3},
    "isolar_realtime": {"status": "ok", "sites": 3},
    "weather": {"status": "ok", "sites": 7}
  }
}
```

Also add a simple health check:
```
GET /api/health
```
Returns `{"status": "ok", "timestamp": "..."}` with no auth required. This is what uptime monitors and Render's health check will hit.

**STOP after this step. I will confirm the endpoint design before you proceed.**

---

### Step 3: Remove APScheduler

Now strip APScheduler from `main.py`:
1. Remove all APScheduler imports
2. Remove the scheduler initialization from the `lifespan` function (or startup event)
3. Remove any scheduler shutdown logic
4. Keep everything else in `lifespan` that is NOT APScheduler-related (e.g., initializing API clients, loading config)
5. Register the new cron router: `app.include_router(cron_router)`
6. Remove `apscheduler` from `requirements.txt`

**Important**: The `lifespan` function probably also initializes the WITS and iSolarCloud clients. That logic MUST stay. Only the scheduler-specific code goes.

After this step, the app should start cleanly with `uvicorn main:app --reload` but with empty/stale data until `/api/cron/refresh` is called.

**STOP after this step. I will test locally before proceeding.**

---

### Step 4: Verify locally

Help me verify the refactor:
1. Start the backend: `cd backend && uvicorn main:app --reload --port 8001`
2. Confirm it starts without errors
3. Hit the cron endpoint: `curl -X POST http://localhost:8001/api/cron/refresh -H "Authorization: Bearer <secret>"`
4. Confirm the response shows successful refresh of all sources
5. Open the frontend and confirm the dashboard displays data as before
6. Wait 5+ minutes without calling cron -- confirm the data is still served (in-memory cache is working)
7. Call cron again -- confirm data refreshes

**STOP after this step. I will confirm everything works before moving to Docker.**

---

### Step 5: Create the Dockerfile

Create a production Dockerfile at the repo root that:
1. Uses `python:3.11-slim` as the base image (NOT Alpine -- some Python packages need glibc)
2. Installs Node.js 20 LTS (needed to build the React frontend)
3. Copies `frontend/`, installs npm dependencies, runs `npm run build`
4. Copies the built static output into a location FastAPI can serve (e.g., `backend/static/`)
5. Copies `backend/`, installs pip dependencies
6. Configures FastAPI to serve the React build as static files at `/` (so the entire app is a single service)
7. Exposes port 8001
8. CMD: `uvicorn main:app --host 0.0.0.0 --port 8001`

The FastAPI static file mounting should:
- Serve `/api/*` routes normally (these are the API endpoints)
- Serve `/assets/*` and other static files from the Vite build output
- Serve `index.html` for all other routes (SPA client-side routing)

Also create a `.dockerignore`:
```
frontend/node_modules
frontend/dist
backend/venv
backend/__pycache__
*.pyc
.git
.env
```

**STOP after this step. I will review the Dockerfile before building.**

---

### Step 6: Create docker-compose.yml

Create `docker-compose.yml` at the repo root for local development:

```yaml
services:
  dashboard:
    build: .
    ports:
      - "8001:8001"
    env_file:
      - backend/.env
    environment:
      - CRON_SECRET=${CRON_SECRET:-dev-secret-change-me}
    restart: unless-stopped
```

No database service yet (Phase 1 is in-memory only).

Test:
```bash
docker compose build
docker compose up
# In another terminal:
curl -X POST http://localhost:8001/api/cron/refresh -H "Authorization: Bearer dev-secret-change-me"
# Open http://localhost:8001 in browser
```

**STOP after this step. I will test the Docker build before proceeding.**

---

### Step 7: Create GitHub Actions cron workflow

Create `.github/workflows/cron-refresh.yml`:

```yaml
name: Dashboard data refresh
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch: {}     # Manual trigger for testing

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger dashboard refresh
        run: |
          response=$(curl -s -w "\n%{http_code}" -X POST \
            "${{ secrets.DASHBOARD_URL }}/api/cron/refresh" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json")
          
          http_code=$(echo "$response" | tail -1)
          body=$(echo "$response" | head -n -1)
          
          echo "HTTP Status: $http_code"
          echo "Response: $body"
          
          if [ "$http_code" -ne 200 ]; then
            echo "::error::Refresh failed with status $http_code"
            exit 1
          fi
```

This requires two GitHub repo secrets:
- `DASHBOARD_URL`: the Render URL (e.g., `https://cog-dashboard.onrender.com`)
- `CRON_SECRET`: the shared secret matching the backend's `CRON_SECRET` env var

**STOP after this step. This workflow is only activated after Render deployment.**

---

### Step 8: Render deployment config (render.yaml)

Create `render.yaml` at the repo root:

```yaml
services:
  - type: web
    name: cog-dashboard
    runtime: docker
    plan: free
    dockerfilePath: ./Dockerfile
    envVars:
      - key: CRON_SECRET
        generateValue: true
      - key: WITS_CLIENT_ID
        sync: false
      - key: WITS_CLIENT_SECRET
        sync: false
      # Add other env vars from .env as needed
    healthCheckPath: /api/health
```

**Do not deploy yet.** This file is ready for when I connect the GitHub repo to Render.

**STOP. This is the end of the implementation plan for Phase 1.**

---

## Reference: file structure after refactor

```
cog-dashboard-serverless/
├── .github/
│   └── workflows/
│       └── cron-refresh.yml
├── backend/
│   ├── main.py               # APScheduler REMOVED, cron router ADDED
│   ├── dependencies.py       # UNCHANGED
│   ├── routers/
│   │   ├── wits.py           # UNCHANGED
│   │   ├── isolar_cloud.py   # UNCHANGED
│   │   └── cron.py           # NEW -- /api/cron/refresh + /api/health
│   ├── services/
│   │   ├── wits_client.py    # UNCHANGED
│   │   └── isolar_cloud.py   # UNCHANGED
│   ├── models/               # UNCHANGED
│   ├── .env                  # Add CRON_SECRET
│   ├── .env.example          # Add CRON_SECRET placeholder
│   └── requirements.txt      # Remove apscheduler
│
├── frontend/                  # COMPLETELY UNCHANGED
│   ├── src/
│   ├── package.json
│   └── ...
│
├── Dockerfile                 # NEW
├── .dockerignore              # NEW
├── docker-compose.yml         # NEW
├── render.yaml                # NEW
└── README.md                  # Update deployment instructions
```

---

## Style notes

- Python: follow existing code style in the repo (check existing files for formatting conventions)
- Use `async def` for the cron endpoint if the existing route handlers are async
- Use `logging` (Python stdlib) for refresh status logging, not `print()`
- Error handling: individual source failures should not crash the entire refresh. Catch per-source, log the error, continue to the next source, and report partial success in the response
- Keep the cron endpoint simple. It calls the same functions APScheduler was calling. No new abstractions, no refactoring of the data-fetching logic itself

---

## What comes later (NOT in this session)

These are Phase 2+ items. Do not implement any of these now:
- Neon DB integration (persistent PostgreSQL)
- Cloudflare Pages frontend deployment (separate CDN)
- Google SSO authentication
- Production domain (app.cognz.com)
- FusionSolar/Huawei API integration
- NIWA/NZNOW weather data
- Public website widget
