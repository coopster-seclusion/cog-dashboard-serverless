from contextlib import asynccontextmanager
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import dependencies
from services.wits_client import WITSClient
from services.isolar_cloud import ISolarCloudClient
from routers import wits as wits_router
from routers import isolar_cloud as solar_router

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
            token_store_path="token_store.json",
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
