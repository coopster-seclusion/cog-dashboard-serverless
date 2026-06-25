from contextlib import asynccontextmanager
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

import dependencies
from services.wits_client import WITSClient
from services.isolar_cloud import ISolarCloudClient
from services.token_store import make_token_store
from routers import wits as wits_router
from routers import isolar_cloud as solar_router
from routers import cron as cron_router

load_dotenv()

_log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # WITS — required
    wits_id = os.getenv("WITS_CLIENT_ID")
    wits_secret = os.getenv("WITS_CLIENT_SECRET")
    if not wits_id or not wits_secret:
        raise RuntimeError(
            "WITS_CLIENT_ID and WITS_CLIENT_SECRET must be set in backend/.env"
        )
    dependencies._wits_client = WITSClient(wits_id, wits_secret)

    # iSolarCloud — optional, starts gracefully if credentials are missing
    isolar_appkey     = os.getenv("app_key")
    isolar_secret_key = os.getenv("secret_key")
    isolar_app_id     = os.getenv("app_id")
    isolar_redirect   = os.getenv("redirect_uri", "http://localhost:8000/api/solar/auth/callback")
    if all([isolar_appkey, isolar_secret_key, isolar_app_id]):
        server_raw = os.getenv("ISOLAR_SERVER", "Australia").split()[0]
        dependencies._isolar_client = ISolarCloudClient(
            appkey=isolar_appkey,
            secret_key=isolar_secret_key,
            app_id=isolar_app_id,
            redirect_uri=isolar_redirect,
            server=server_raw,
            token_store=make_token_store(),
        )
        if dependencies._isolar_client.is_authorised:
            _log.info("iSolarCloud: valid tokens loaded from token_store.json — ready.")
        else:
            _log.warning(
                "iSolarCloud: credentials ready but not yet authorised. "
                "GET /api/solar/auth/url to start OAuth2 flow."
            )
    else:
        _log.warning(
            "iSolarCloud: app_key / secret_key / app_id not set — solar endpoints disabled."
        )

    yield


app = FastAPI(
    title="NZ Electricity Market Dashboard API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(wits_router.router, prefix="/api")
app.include_router(solar_router.router, prefix="/api/solar")
app.include_router(cron_router.router, prefix="/api")


# ---------------------------------------------------------------------------
# Serve the built React frontend (production / Docker). Skipped in local dev
# when backend/static/ does not exist — API routes still work via uvicorn.
# Registered AFTER the API routers so /api/* always takes precedence.
# ---------------------------------------------------------------------------
_STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

if os.path.isdir(_STATIC_DIR):
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(_STATIC_DIR, "assets")),
        name="assets",
    )

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # API paths are handled above; anything left that isn't a real file
        # falls back to index.html for client-side (React Router) routing.
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = os.path.join(_STATIC_DIR, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(_STATIC_DIR, "index.html"))
