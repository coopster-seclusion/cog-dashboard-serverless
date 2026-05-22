from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from dependencies import get_isolar_client
from models.isolar_cloud import (
    AuthStatusResponse,
    AuthUrlResponse,
    HistoricalResponse,
    PlantsResponse,
    RealtimeResponse,
)
from services.isolar_cloud import ISolarCloudClient, ISolarCloudError

router = APIRouter()


# ---------------------------------------------------------------------------
# OAuth2 setup — one-time flow, then token auto-refreshes forever
# ---------------------------------------------------------------------------

@router.get("/auth/url", response_model=AuthUrlResponse)
def get_auth_url(solar: ISolarCloudClient = Depends(get_isolar_client)):
    """Step 1: open the returned URL in a browser to start the OAuth2 consent flow."""
    return {
        "url": solar.auth_url(),
        "instructions": (
            "Open this URL in a browser. Log in to iSolarCloud and approve access. "
            "You will be redirected to your redirect_uri automatically — "
            "the server will capture the code and save tokens."
        ),
    }


@router.get("/auth/callback")
def auth_callback(
    code: str = Query(..., description="Authorization code from iSolarCloud redirect"),
    solar: ISolarCloudClient = Depends(get_isolar_client),
):
    """Step 2: iSolarCloud redirects here with ?code=... — exchanges it for tokens."""
    try:
        solar.exchange_code(code)
    except ISolarCloudError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return {"detail": "Authorised. Tokens saved — solar endpoints are now active."}


@router.get("/auth/status", response_model=AuthStatusResponse)
def auth_status(solar: ISolarCloudClient = Depends(get_isolar_client)):
    return {"authorised": solar.is_authorised}


# ---------------------------------------------------------------------------
# Plants
# ---------------------------------------------------------------------------

@router.get("/plants", response_model=PlantsResponse)
def get_plants(solar: ISolarCloudClient = Depends(get_isolar_client)):
    try:
        raw = solar.get_plants()
    except ISolarCloudError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    plants = [
        {
            "ps_id":              str(p.get("ps_id", "")),
            "ps_name":            p.get("ps_name"),
            "ps_location":        p.get("ps_location"),
            "installed_capacity": p.get("design_capacity"),
            "latitude":           p.get("latitude"),
            "longitude":          p.get("longitude"),
            "fault_status":       p.get("ps_fault_status"),
            "valid_flag":         p.get("valid_flag"),
        }
        for p in raw
    ]
    return {"plants": plants}


# ---------------------------------------------------------------------------
# Real-time data  (5-minute resolution from iSolarCloud)
# ---------------------------------------------------------------------------

@router.get("/plants/{plant_id}/realtime", response_model=RealtimeResponse)
def get_realtime(
    plant_id: str,
    solar: ISolarCloudClient = Depends(get_isolar_client),
):
    try:
        raw = solar.get_realtime_data(plant_id)
    except ISolarCloudError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return {"plants": raw}


# ---------------------------------------------------------------------------
# Historical minute data
# ---------------------------------------------------------------------------

@router.get("/plants/{plant_id}/history", response_model=HistoricalResponse)
def get_history(
    plant_id: str,
    start: str = Query(..., description="Start datetime — YYYYMMDDHHMMSS"),
    end: str | None = Query(default=None, description="End datetime (defaults to start + 3h)"),
    interval: int = Query(default=5, ge=1, le=60, description="Interval in minutes"),
    solar: ISolarCloudClient = Depends(get_isolar_client),
):
    DT_FMT = "%Y%m%d%H%M%S"
    try:
        start_dt = datetime.strptime(start, DT_FMT)
        end_dt   = datetime.strptime(end, DT_FMT) if end else None
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid datetime format: {exc}")

    try:
        raw = solar.get_historical_data(plant_id, start_dt, end_dt, interval_minutes=interval)
    except ISolarCloudError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return {"plants": raw}
