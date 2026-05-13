from contextlib import asynccontextmanager
import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from models import (
    EnergyQuantitiesResponse,
    NodesResponse,
    PricesResponse,
    ReserveQuantitiesResponse,
    SchedulesResponse,
    SpreadResponse,
)
from wits_client import (
    COMMON_NODES,
    RESERVE_RUN_CLASSES,
    SCHEDULE_METADATA,
    SCHEDULES,
    WITSClient,
)

load_dotenv()

_client: WITSClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _client
    client_id = os.getenv("WITS_CLIENT_ID")
    client_secret = os.getenv("WITS_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise RuntimeError(
            "WITS_CLIENT_ID and WITS_CLIENT_SECRET must be set in backend/.env"
        )
    _client = WITSClient(client_id, client_secret)
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


def get_client() -> WITSClient:
    if _client is None:
        raise HTTPException(status_code=503, detail="WITS client not initialised")
    return _client


# ---------------------------------------------------------------------------
# Schedules & nodes (metadata — no WITS price call)
# ---------------------------------------------------------------------------

@app.get("/api/schedules", response_model=SchedulesResponse)
def get_schedules(wits: WITSClient = Depends(get_client)):
    try:
        raw = wits.get_schedules()
        codes = [
            item.get("schedule", item) if isinstance(item, dict) else str(item)
            for item in raw
        ]
    except Exception:
        codes = SCHEDULES  # fall back to static list if API call fails

    schedules = []
    for code in codes:
        meta = SCHEDULE_METADATA.get(code, {})
        schedules.append(
            {
                "code": code,
                "label": meta.get("label", code),
                "supports_forward": meta.get("supports_forward", False),
                "market_types": meta.get("market_types", []),
                "description": meta.get("description", ""),
            }
        )
    return {"schedules": schedules}


@app.get("/api/nodes", response_model=NodesResponse)
def get_nodes():
    return {"nodes": COMMON_NODES}


# ---------------------------------------------------------------------------
# Market prices
# ---------------------------------------------------------------------------

@app.get("/api/prices", response_model=PricesResponse)
def get_prices(
    schedule: str = Query(default="RTD"),
    marketType: str = Query(default="E"),
    nodes: str | None = Query(default=None, description="Comma-separated node IDs"),
    back: int | None = Query(default=48, ge=1, le=48),
    forward: int | None = Query(default=None, ge=1, le=48),
    island: str | None = Query(default=None, pattern="^(NI|SI)$"),
    from_dt: str | None = Query(default=None, alias="from"),
    to_dt: str | None = Query(default=None, alias="to"),
    wits: WITSClient = Depends(get_client),
):
    node_list = [n.strip() for n in nodes.split(",")] if nodes else None
    try:
        if node_list and len(node_list) > 1:
            raw = wits.get_prices_by_node(
                schedule, marketType, node_list, back, forward, from_dt, to_dt, island
            )
            nodes_out = {
                node: {"prices": data["prices"], "timestamps": data["timestamps"]}
                for node, data in raw.items()
            }
        else:
            single = node_list[0] if node_list else None
            raw = wits.get_spot_prices(
                schedule, marketType, single, back, forward, from_dt, to_dt, island
            )
            key = single or "all"
            nodes_out = {key: {"prices": raw["prices"], "timestamps": raw["timestamps"]}}
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return {"schedule": schedule, "market_type": marketType, "nodes": nodes_out}


@app.get("/api/prices/spread", response_model=SpreadResponse)
def get_prices_spread(
    nodeA: str = Query(...),
    nodeB: str = Query(...),
    schedule: str = Query(default="RTD"),
    marketType: str = Query(default="E"),
    back: int | None = Query(default=48, ge=1, le=48),
    forward: int | None = Query(default=None, ge=1, le=48),
    wits: WITSClient = Depends(get_client),
):
    try:
        raw = wits.get_prices_by_node(
            schedule, marketType, [nodeA, nodeB], back, forward
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    a = raw.get(nodeA, {"prices": [], "timestamps": []})
    b = raw.get(nodeB, {"prices": [], "timestamps": []})
    spread = [
        round(pa - pb, 4) if pa is not None and pb is not None else None
        for pa, pb in zip(a["prices"], b["prices"])
    ]
    return {
        "nodeA": nodeA,
        "nodeB": nodeB,
        "schedule": schedule,
        "timestamps": a["timestamps"],
        "priceA": a["prices"],
        "priceB": b["prices"],
        "spread": spread,
    }


# ---------------------------------------------------------------------------
# Quantities
# ---------------------------------------------------------------------------

@app.get("/api/quantities/energy", response_model=EnergyQuantitiesResponse)
def get_energy_quantities(
    schedule: str = Query(...),
    island: str | None = Query(default=None, pattern="^(NI|SI)$"),
    back: int | None = Query(default=24, ge=1, le=48),
    forward: int | None = Query(default=None, ge=1, le=48),
    from_dt: str | None = Query(default=None, alias="from"),
    to_dt: str | None = Query(default=None, alias="to"),
    wits: WITSClient = Depends(get_client),
):
    try:
        raw = wits.get_energy_quantities(schedule, back, forward, from_dt, to_dt, island)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    records = [
        {
            "timestamp": r.get("tradingDateTime"),
            "trading_period": r.get("tradingPeriod"),
            "island": r.get("island"),
            "load": r.get("load"),
            "generation": r.get("generation"),
            "intermittent_generation": r.get("intermittentGeneration"),
            "total_bids": r.get("totalBids"),
            "total_offers": r.get("totalOffers"),
            "intermittent_offers": r.get("intermittentOffers"),
        }
        for r in raw.get("energyQuantities", [])
    ]
    return {"schedule": schedule, "island": island, "records": records}


@app.get("/api/quantities/reserves", response_model=ReserveQuantitiesResponse)
def get_reserve_quantities(
    schedule: str = Query(...),
    runClass: str = Query(...),
    island: str | None = Query(default=None, pattern="^(NI|SI)$"),
    back: int | None = Query(default=24, ge=1, le=48),
    forward: int | None = Query(default=None, ge=1, le=48),
    from_dt: str | None = Query(default=None, alias="from"),
    to_dt: str | None = Query(default=None, alias="to"),
    wits: WITSClient = Depends(get_client),
):
    if runClass not in RESERVE_RUN_CLASSES:
        raise HTTPException(
            status_code=422,
            detail=f"runClass must be one of {RESERVE_RUN_CLASSES}",
        )
    try:
        raw = wits.get_reserve_quantities(
            schedule, runClass, back, forward, from_dt, to_dt, island
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    records = [
        {
            "timestamp": r.get("tradingDateTime"),
            "trading_period": r.get("tradingPeriod"),
            "island": r.get("island"),
            "run_type": r.get("runType"),
            "reserve_class": r.get("reserveClass"),
            "run_class": r.get("runClass"),
            "price": r.get("price"),
            "reserve_mw": r.get("reserveMw"),
            "risk_mw": r.get("riskMw"),
            "risk_adjustment_factor": r.get("riskAdjustmentFactor"),
        }
        for r in raw.get("reserveQuantities", [])
    ]
    return {"schedule": schedule, "run_class": runClass, "island": island, "records": records}
