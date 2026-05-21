from pydantic import BaseModel


class NodePrices(BaseModel):
    prices: list[float | None]
    timestamps: list[str | None]


class PricesResponse(BaseModel):
    schedule: str
    market_type: str
    nodes: dict[str, NodePrices]


class SpreadResponse(BaseModel):
    nodeA: str
    nodeB: str
    schedule: str
    timestamps: list[str | None]
    priceA: list[float | None]
    priceB: list[float | None]
    spread: list[float | None]


class ScheduleInfo(BaseModel):
    code: str
    label: str
    supports_forward: bool
    market_types: list[str]
    description: str


class SchedulesResponse(BaseModel):
    schedules: list[ScheduleInfo]


class NodesResponse(BaseModel):
    nodes: dict[str, str]


class EnergyRecord(BaseModel):
    timestamp: str | None
    trading_period: int | None
    island: str | None
    load: float | None
    generation: float | None
    intermittent_generation: float | None
    total_bids: float | None
    total_offers: float | None
    intermittent_offers: float | None


class EnergyQuantitiesResponse(BaseModel):
    schedule: str
    island: str | None
    records: list[EnergyRecord]


class ReserveRecord(BaseModel):
    timestamp: str | None
    trading_period: int | None
    island: str | None
    run_type: str | None
    reserve_class: str | None
    run_class: str | None
    price: float | None
    reserve_mw: float | None
    risk_mw: float | None
    risk_adjustment_factor: float | None


class ReserveQuantitiesResponse(BaseModel):
    schedule: str
    run_class: str
    island: str | None
    records: list[ReserveRecord]
