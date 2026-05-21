from contextlib import asynccontextmanager
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import dependencies
from services.wits_client import WITSClient
from routers import wits as wits_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    client_id = os.getenv("WITS_CLIENT_ID")
    client_secret = os.getenv("WITS_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise RuntimeError(
            "WITS_CLIENT_ID and WITS_CLIENT_SECRET must be set in backend/.env"
        )
    dependencies._wits_client = WITSClient(client_id, client_secret)
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
