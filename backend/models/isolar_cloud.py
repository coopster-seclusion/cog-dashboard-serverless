from pydantic import BaseModel


class PlantSummary(BaseModel):
    ps_id: str
    ps_name: str | None = None
    ps_location: str | None = None
    installed_capacity: float | None = None  # W (install_power from detail; design_capacity from list)
    latitude: float | None = None
    longitude: float | None = None
    fault_status: int | None = None  # 1=Fault, 2=Alarm, 3=Normal
    valid_flag: int | None = None    # 1=Normal, 2=Disabled, 3=Connected


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
    daily_load_consumption: MeasurePoint | None = None
    grid_active_power: MeasurePoint | None = None       # 83549 — +ve import, -ve export
    feed_in_energy_today: MeasurePoint | None = None
    feed_in_energy_total: MeasurePoint | None = None    # 83075 — lifetime export
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
    daily_load_consumption: float | None = None
    grid_active_power: float | None = None
    feed_in_energy_today: float | None = None
    feed_in_energy_total: float | None = None
    energy_purchased_today: float | None = None
    pcs_total_active_power: float | None = None
    battery_soc: float | None = None
    irradiance: float | None = None


class HistoricalResponse(BaseModel):
    plants: dict[str, list[HistoricalRecord]]


class DeviceSummary(BaseModel):
    ps_key: str
    device_sn: str | None = None
    device_type: int | None = None
    type_name: str | None = None
    fault_status: int | None = None  # 1=Fault, 2=Alarm, 4=Normal
    device_code: int | None = None   # index within device type (1-based)


class DevicesResponse(BaseModel):
    devices: list[DeviceSummary]


class DailyYield(BaseModel):
    date: str          # YYYYMMDD
    kwh: float


class YieldsResponse(BaseModel):
    yields: list[DailyYield]


class AuthUrlResponse(BaseModel):
    url: str
    instructions: str


class AuthStatusResponse(BaseModel):
    authorised: bool
