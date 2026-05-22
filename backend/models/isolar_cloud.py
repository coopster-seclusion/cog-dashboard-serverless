from pydantic import BaseModel


class PlantSummary(BaseModel):
    ps_id: str
    ps_name: str | None = None
    ps_location: str | None = None
    installed_capacity: float | None = None  # kWp


class PlantsResponse(BaseModel):
    plants: list[PlantSummary]


class MeasurePoint(BaseModel):
    value: float | str | None
    unit: str | None = None
    name: str | None = None


class PlantRealtimeData(BaseModel):
    power: MeasurePoint | None = None
    daily_yield: MeasurePoint | None = None
    total_yield: MeasurePoint | None = None
    load_power: MeasurePoint | None = None
    meter_ac_power: MeasurePoint | None = None
    feed_in_energy_today: MeasurePoint | None = None
    energy_purchased_today: MeasurePoint | None = None
    pcs_total_active_power: MeasurePoint | None = None
    battery_soc: MeasurePoint | None = None
    daily_battery_charge: MeasurePoint | None = None
    daily_battery_discharge: MeasurePoint | None = None
    ambient_temperature: MeasurePoint | None = None
    irradiance: MeasurePoint | None = None


class RealtimeResponse(BaseModel):
    plants: dict[str, PlantRealtimeData]


class HistoricalRecord(BaseModel):
    timestamp: str | None = None
    power: float | None = None
    daily_yield: float | None = None
    load_power: float | None = None
    meter_ac_power: float | None = None
    pcs_total_active_power: float | None = None
    battery_soc: float | None = None
    irradiance: float | None = None


class HistoricalResponse(BaseModel):
    plants: dict[str, list[HistoricalRecord]]


class AuthUrlResponse(BaseModel):
    url: str
    instructions: str


class AuthStatusResponse(BaseModel):
    authorised: bool
