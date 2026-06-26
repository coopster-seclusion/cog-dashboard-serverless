# Session Notes — COG Dashboard

> Planning for the **next** session. Written 2026-06-26.

---

## Next session: Google SSO (auth gate in front of the dashboard)

### Goal

Put a Google sign-in landing page in front of the app. Only approved Google
accounts (the COG team) can reach the COG Properties dashboard or its data APIs.
Everyone else sees a login screen and nothing else.

### Where we're starting from

- Single FastAPI service serves the React SPA as static files (one Render service).
- One page: **COG Properties at `/`**. No auth today — anyone with the URL sees it.
- Backend routers: `isolar_cloud.py` (`/api/solar/*`), `cron.py` (`/api/health`).
- Persistence available: **Neon Postgres** via `DATABASE_URL` (already used for iSolar tokens).
- Frontend: React 18 + Vite + TanStack Query + React Router v6 + Tailwind/shadcn.
- Deploy: Docker on Render (free), TLS provided by Render. SPA fallback serves
  `index.html` for all non-`/api/*` paths (see `main.py` `serve_spa`).

### Chosen approach (backend-mediated Google OIDC + session cookie)

Mirror the pattern already used for iSolarCloud: the **backend** runs the OAuth2
flow, the browser never holds client secrets.

```
Browser → "Sign in with Google" → GET /api/auth/google/login
  → redirect to Google consent
  → Google → GET /api/auth/google/callback?code=...
  → backend verifies ID token, checks allowlist, sets httpOnly session cookie
  → redirect to /
Frontend calls GET /api/auth/me on load → shows dashboard or login page
Protected data routes require the session cookie (401 otherwise)
```

Session = signed cookie via **Starlette `SessionMiddleware`** (simplest; stateless,
no session table needed). Store just `{email, name, picture, exp}`. Revoke by
rotating `SESSION_SECRET` or shortening expiry. (DB-backed sessions are an option
later if we need server-side revocation.)

### Access control

Restrict to an allowlist — pick one (decision below):
- **Domain restriction** (preferred if COG uses Google Workspace): only
  `hd == <company-domain>` from the verified ID token.
- **Explicit email allowlist** via env var (`ALLOWED_EMAILS=a@x.com,b@x.com`).

Enforce on the **API**, not just the UI: a `require_user` FastAPI dependency that
reads the session and 401s if absent/expired. Apply to all `/api/solar/*` routes.
Keep `/api/health` and the auth routes **public**.

### Backend work

1. Add deps to `requirements.txt`: `authlib`, `itsdangerous` (for SessionMiddleware).
   Authlib pulls `httpx`.
2. `main.py`: add `SessionMiddleware(secret_key=SESSION_SECRET, https_only=True,
   same_site="lax")`; register the auth router; keep CORS/static as-is.
3. New `routers/auth.py`:
   - `GET /api/auth/google/login` → Authlib redirect to Google (with `state`).
   - `GET /api/auth/google/callback` → exchange code, verify ID token, check
     allowlist, set session, redirect to `/`. On reject → redirect to a
     `?error=unauthorized` login state.
   - `POST /api/auth/logout` → clear session.
   - `GET /api/auth/me` → `{email,name,picture}` or 401.
4. New `dependencies.require_user` and apply to solar routes.
5. Config via env (see below). Derive the OAuth redirect from a base URL so local
   vs prod just differ by env var.

### Frontend work

1. `AuthContext` + `useAuth()` → query `GET /api/auth/me` (TanStack Query).
2. `pages/Login.tsx` — branded landing with a single "Sign in with Google" button
   that navigates to `/api/auth/google/login`. Show an error if `?error=unauthorized`.
3. Route guard in `App.tsx`: while loading → spinner; if 401 → `<Login/>`; else the
   existing `<COGProperties/>` shell. (SPA is still served to everyone; the data is
   what's actually protected.)
4. Add a **logout** button + the signed-in user's email/avatar to `TopBar`.

### Environment variables (add to `.env.example` + `render.yaml`)

| Variable               | Notes                                                          |
| ---------------------- | -------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`     | From Google Cloud Console OAuth client.                        |
| `GOOGLE_CLIENT_SECRET` | "                                                              |
| `SESSION_SECRET`       | Random 32+ bytes; signs the session cookie. `generateValue` on Render. |
| `ALLOWED_DOMAIN` or `ALLOWED_EMAILS` | Access allowlist (pick one).                    |
| `PUBLIC_BASE_URL`      | e.g. `https://cog-dashboard.onrender.com` — to build the redirect URI. |

### Google Cloud Console setup (manual, before coding)

1. Create/select a project → **APIs & Services → OAuth consent screen**.
   - **Internal** if COG has Workspace (simplest, auto-restricts to the org);
     otherwise **External** + add test users.
2. **Credentials → Create OAuth client ID → Web application**.
3. Authorized redirect URIs:
   - `https://<render-url>/api/auth/google/callback`
   - `http://localhost:8001/api/auth/google/callback` (local dev)
4. Copy client ID + secret → set as Render env vars.

### Implementation order

1. Google Cloud Console setup (manual) → obtain client id/secret.
2. Backend: deps + SessionMiddleware + auth router + `require_user` + protect solar routes.
3. Frontend: AuthContext + Login page + route guard + logout in TopBar.
4. Wire env vars (`.env.example`, `render.yaml`).
5. Test locally with the localhost redirect, then deploy + test on Render.
6. Update `README.md`.

### Decisions to confirm at the start of next session

- **Allowlist model**: Workspace domain restriction vs explicit email list — and the
  exact domain/emails.
- **Consent screen**: Internal (Workspace) or External?
- **Session length** (e.g. 7 days) and whether we need server-side revocation now
  (cookie-only vs DB sessions).
- Confirm the production domain to register (still `*.onrender.com`, or the future
  `app.cognz.com`?).

### Watch-outs

- Keep `/api/health` public — Render's health check must not be gated.
- Session cookie must be `Secure` + `httpOnly` + `SameSite=Lax`; relies on Render TLS.
- Register the redirect URI in Google **exactly** (scheme + host + path), like we hit
  with the iSolarCloud `redirect_uri`.
- `/api/auth/*` and the SPA shell stay public; only data routes require the session.

---

## Security cleanup carried over

The previous contents of this file (now deleted) contained a live iSolarCloud
`app_key` in plaintext, and `backend/token_store.json` (with OAuth tokens) is still
present in **git history**. If the repo is/ becomes public, rotate the iSolarCloud
credentials. Going forward, secrets live only in `.env` (gitignored) and the Render
dashboard.
