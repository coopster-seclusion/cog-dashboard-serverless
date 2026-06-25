"""
iSolarCloud API Client (Sungrow) — OAuth2 Authorization Code flow.
https://developer-api.isolarcloud.com/

Auth flow (OAuth2.0: Yes):
  1. Call auth_url() → open in browser → user approves → redirected to redirect_uri?code=XXX
  2. Call exchange_code(code) → stores access_token + refresh_token in token_store.json
  3. All API calls use:  x-access-key: <secret_key>  +  Authorization: Bearer <access_token>
  4. Token auto-refreshes from refresh_token on expiry.

Credentials needed in .env:
  app_key       — Appkey from developer portal
  secret_key    — Secret key from developer portal
  app_id        — Application ID (visible when OAuth2 is enabled)
  redirect_uri  — Must match what's set in the developer portal
                  (e.g. http://localhost:8000/api/solar/auth/callback)
  ISOLAR_SERVER — (optional) China | International | Europe | Australia (default)
"""

import logging
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from urllib.parse import quote_plus

import requests

from services.token_store import FileTokenStore

_log = logging.getLogger(__name__)

SERVERS = {
    "China":         "https://gateway.isolarcloud.com",
    "International": "https://gateway.isolarcloud.com.hk",
    "Europe":        "https://gateway.isolarcloud.eu",
    "Australia":     "https://augateway.isolarcloud.com",  # NZ uses AU
}

AUTH_WEB = {
    "China":         ("web3.isolarcloud.com", 1),
    "International": ("web3.isolarcloud.com.hk", 2),
    "Europe":        ("web3.isolarcloud.eu", 3),
    "Australia":     ("auweb3.isolarcloud.com", 7),
}

# Point IDs for real-time plant data (getPowerStationRealTimeData)
REALTIME_POINTS = {
    "83033": "power",                    # W   — PV output power
    "83022": "daily_yield",              # Wh  — today's PV yield
    "83024": "total_yield",              # Wh  — all-time PV yield
    "83106": "load_power",               # W   — site load
    "83118": "daily_load_consumption",   # Wh  — today's total consumption
    "83549": "grid_active_power",        # W   — grid (+ve import, -ve export)
    "83072": "feed_in_energy_today",     # Wh  — exported to grid today
    "83075": "feed_in_energy_total",     # Wh  — lifetime export to grid
    "83102": "energy_purchased_today",   # Wh  — imported from grid today
    "83046": "pcs_total_active_power",   # W   — battery (+ve charge, -ve discharge)
    "83252": "battery_soc",              # %   — battery state of charge
    "83243": "daily_battery_charge",     # Wh  — battery charged today
    "83244": "daily_battery_discharge",  # Wh  — battery discharged today
    "83016": "ambient_temperature",      # °C
    "83012": "irradiance",               # W/m²
}


class ISolarCloudError(Exception):
    pass


class ISolarCloudClient:
    def __init__(
        self,
        appkey: str,
        secret_key: str,
        app_id: str,
        redirect_uri: str,
        server: str = "Australia",
        token_store_path: str = "token_store.json",
        token_store=None,
    ):
        self.appkey = appkey
        self.secret_key = secret_key
        self.app_id = app_id
        self.redirect_uri = redirect_uri
        self.gateway = SERVERS[server]
        self._auth_web, self._cloud_id = AUTH_WEB[server]
        # Persistence backend: injected store (e.g. Postgres) or a local JSON file.
        self._store = token_store or FileTokenStore(token_store_path)
        self._tokens: dict | None = None
        self._load_tokens()

    # ------------------------------------------------------------------
    # Token persistence
    # ------------------------------------------------------------------

    def _load_tokens(self) -> None:
        stored = self._store.load()
        if stored and stored.get("access_token"):
            self._tokens = stored

    def _save_tokens(self) -> None:
        self._store.save(self._tokens)

    # ------------------------------------------------------------------
    # OAuth2 flow
    # ------------------------------------------------------------------

    def auth_url(self) -> str:
        """Return the iSolarCloud consent URL the user must open in a browser."""
        return (
            f"https://{self._auth_web}/#/authorized-app"
            f"?cloudId={self._cloud_id}"
            f"&applicationId={self.app_id}"
            f"&redirectUrl={quote_plus(self.redirect_uri)}"
        )

    def exchange_code(self, code: str) -> None:
        """Exchange the OAuth2 authorization code for access + refresh tokens."""
        resp = requests.post(
            f"{self.gateway}/openapi/apiManage/token",
            headers={"x-access-key": self.secret_key, "Content-Type": "application/json"},
            json={
                "appkey": self.appkey,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": self.redirect_uri,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if "access_token" not in data:
            raise ISolarCloudError(f"Token exchange failed: {data}")
        self._tokens = {
            "access_token":  data["access_token"],
            "refresh_token": data["refresh_token"],
            "expires_at":    int(time.time()) + data.get("expires_in", 3600) - 60,
        }
        self._save_tokens()
        _log.info("iSolarCloud: OAuth2 tokens saved.")

    def _refresh_tokens(self) -> None:
        if not self._tokens or not self._tokens.get("refresh_token"):
            raise ISolarCloudError(
                "No refresh token — complete OAuth2 flow via GET /api/solar/auth/url."
            )
        resp = requests.post(
            f"{self.gateway}/openapi/apiManage/refreshToken",
            headers={"x-access-key": self.secret_key},
            json={"appkey": self.appkey, "refresh_token": self._tokens["refresh_token"]},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if "access_token" not in data:
            raise ISolarCloudError(f"Token refresh failed: {data}")
        self._tokens = {
            "access_token":  data["access_token"],
            "refresh_token": data["refresh_token"],
            "expires_at":    int(time.time()) + data.get("expires_in", 3600) - 60,
        }
        self._save_tokens()

    @property
    def _access_token(self) -> str:
        if not self._tokens:
            raise ISolarCloudError(
                "Not authorised — open GET /api/solar/auth/url in a browser to start OAuth2 flow."
            )
        if time.time() >= self._tokens["expires_at"]:
            self._refresh_tokens()
        return self._tokens["access_token"]

    @property
    def is_authorised(self) -> bool:
        """True if tokens are held (access_token may be expired but refresh_token present)."""
        return bool(self._tokens and self._tokens.get("access_token"))

    # ------------------------------------------------------------------
    # Request helper
    # ------------------------------------------------------------------

    def _post(self, path: str, params: dict, *, lang: str = "_en_US") -> dict:
        if not path.startswith("/"):
            path = f"/{path}"
        body = {"appkey": self.appkey, "lang": lang, **params}
        headers = {
            "x-access-key":  self.secret_key,
            "Authorization": f"Bearer {self._access_token}",
        }
        resp = requests.post(
            f"{self.gateway}{path}", json=body, headers=headers, timeout=15
        )
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            raise ISolarCloudError(f"API error from {path}: {data}")
        return data

    # ------------------------------------------------------------------
    # Plants
    # ------------------------------------------------------------------

    def get_plants(self, page: int = 1, size: int = 100) -> list[dict]:
        data = self._post(
            "/openapi/platform/queryPowerStationList",
            {"page": page, "size": size},
        )
        return data["result_data"]["pageList"]

    def get_devices(self, plant_id: str, device_type_list: list[int] | None = None) -> list[dict]:
        params: dict = {"ps_id": plant_id, "page": 1, "size": 50}
        if device_type_list:
            params["device_type_list"] = device_type_list
        data = self._post("/openapi/platform/getDeviceListByPsId", params)
        return data["result_data"]["pageList"]

    def get_plant_details(self, plant_ids: str | list[str]) -> list[dict]:
        ps = ",".join(plant_ids) if isinstance(plant_ids, list) else plant_ids
        data = self._post("/openapi/platform/getPowerStationDetail", {"ps_ids": ps})
        return data["result_data"]["data_list"]

    # ------------------------------------------------------------------
    # Real-time data  (5-minute cadence from iSolarCloud)
    # ------------------------------------------------------------------

    def get_realtime_data(
        self,
        plant_ids: str | list[str],
        point_ids: list[str] | None = None,
    ) -> dict:
        """
        Returns:
            { "<ps_id>": { "power": {"value": 3200.0, "unit": "W"}, ... } }
        """
        if isinstance(plant_ids, str):
            plant_ids = [plant_ids]
        if point_ids is None:
            point_ids = list(REALTIME_POINTS.keys())

        data = self._post(
            "/openapi/platform/getPowerStationRealTimeData",
            {"ps_id_list": plant_ids, "point_id_list": point_ids, "is_get_point_dict": "1"},
        )
        point_dict = {str(p["point_id"]): p for p in data["result_data"].get("point_dict", [])}
        result = {}
        for device in data["result_data"].get("device_point_list", []):
            ps_id = str(device["ps_id"])
            plant_data = {}
            for k, v in device.items():
                if k.startswith("p") and k[1:].isdigit():
                    pid = k[1:]
                    meta = point_dict.get(pid, {})
                    try:
                        val = float(v) if v is not None else None
                    except (ValueError, TypeError):
                        val = v
                    plant_data[REALTIME_POINTS.get(pid, pid)] = {
                        "value": val,
                        "unit":  meta.get("point_unit"),
                        "name":  meta.get("point_name"),
                    }
            result[ps_id] = plant_data
        return result

    # ------------------------------------------------------------------
    # Historical minute data
    # ------------------------------------------------------------------

    def get_historical_data_chunked(
        self,
        plant_ids: str | list[str],
        start_time: datetime,
        end_time: datetime,
        point_ids: list[str] | None = None,
        interval_minutes: int = 5,
        chunk_hours: int = 3,
    ) -> dict:
        """Splits long ranges into chunk_hours windows and fetches in parallel."""
        if isinstance(plant_ids, str):
            plant_ids = [plant_ids]

        chunks: list[tuple[datetime, datetime]] = []
        t = start_time
        while t < end_time:
            chunks.append((t, min(t + timedelta(hours=chunk_hours), end_time)))
            t += timedelta(hours=chunk_hours)

        combined: dict[str, list] = {pid: [] for pid in plant_ids}

        def fetch(span: tuple[datetime, datetime]) -> dict:
            s, e = span
            if s >= e:
                return {}
            try:
                return self.get_historical_data(plant_ids, s, e, point_ids, interval_minutes)
            except ISolarCloudError as exc:
                _log.warning("history chunk %s–%s failed: %s", s, e, exc)
                return {}

        with ThreadPoolExecutor(max_workers=min(8, len(chunks) or 1)) as pool:
            for result in pool.map(fetch, chunks):
                for pid, records in result.items():
                    if pid in combined:
                        combined[pid].extend(records)

        for pid in combined:
            combined[pid].sort(key=lambda r: r.get("timestamp") or "")
        return combined

    def get_daily_yields(
        self,
        plant_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> list[dict]:
        """
        Returns one kWh total per calendar day by sampling the 18:00–19:00
        window of each day (captures end-of-day daily_yield accumulation).
        Parallel fetches — one API call per day.
        """
        days: list[datetime] = []
        cur = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        while cur <= end_date:
            days.append(cur)
            cur += timedelta(days=1)

        def fetch_day(day: datetime) -> dict:
            date_str = day.strftime("%Y%m%d")
            if day.date() == today.date():
                now = datetime.now()
                if now.hour >= 19:
                    # Past 7 PM — the 18:00–19:00 window has the final daily yield
                    window_start = day.replace(hour=18, minute=0, second=0)
                    window_end   = day.replace(hour=19, minute=0, second=0)
                    result = self.get_historical_data(plant_id, window_start, window_end, interval_minutes=60)
                else:
                    # During generation hours — floor start to last full hour boundary
                    floored = now.replace(minute=0, second=0, microsecond=0)
                    window_start = max(day, floored - timedelta(hours=1))
                    window_end   = floored
                    result = self.get_historical_data(plant_id, window_start, window_end, interval_minutes=60)
            else:
                window_start = day.replace(hour=18)
                window_end   = day.replace(hour=19)
                result  = self.get_historical_data(plant_id, window_start, window_end, interval_minutes=60)
            try:
                series  = result.get(plant_id, [])
                yields  = [r["daily_yield"] for r in series if r.get("daily_yield") is not None]
                kwh     = round(max(yields) / 1000, 1) if yields else 0.0
            except ISolarCloudError:
                kwh = 0.0
            return {"date": date_str, "kwh": kwh}

        with ThreadPoolExecutor(max_workers=10) as pool:
            results = list(pool.map(fetch_day, days))
        return results

    def get_historical_data(
        self,
        plant_ids: str | list[str],
        start_time: datetime,
        end_time: datetime | None = None,
        point_ids: list[str] | None = None,
        interval_minutes: int = 5,
    ) -> dict:
        """
        Returns:
            { "<ps_id>": [{"timestamp": "20260521120000", "power": 3200.0, ...}] }
        """
        if isinstance(plant_ids, str):
            plant_ids = [plant_ids]
        if point_ids is None:
            point_ids = list(REALTIME_POINTS.keys())
        if end_time is None:
            end_time = start_time + timedelta(hours=3)

        TS_FMT = "%Y%m%d%H%M%S"
        data = self._post(
            "/openapi/platform/getPowerStationPointMinuteDataList",
            {
                "ps_id_list":        plant_ids,
                "points":            ",".join(f"p{pid}" for pid in point_ids),
                "is_get_point_dict": "1",
                "start_time_stamp":  start_time.strftime(TS_FMT),
                "end_time_stamp":    end_time.strftime(TS_FMT),
                "minute_interval":   str(interval_minutes),
            },
        )
        if data.get("result_code") != "1":
            raise ISolarCloudError(f"Historical data error: {data}")

        point_dict = {str(p["point_id"]): p for p in data["result_data"].get("point_dict", [])}
        result = {}
        for ps_id, frames in data["result_data"].items():
            if ps_id == "point_dict":
                continue
            series = []
            for frame in frames:
                row: dict = {"timestamp": frame.get("time_stamp")}
                for k, v in frame.items():
                    if k != "time_stamp" and k.startswith("p") and k[1:].isdigit():
                        pid = k[1:]
                        try:
                            row[REALTIME_POINTS.get(pid, pid)] = float(v) if v is not None else None
                        except (ValueError, TypeError):
                            row[REALTIME_POINTS.get(pid, pid)] = v
                series.append(row)
            result[str(ps_id)] = series
        return result

    # ------------------------------------------------------------------
    # YTD energy — total_yield delta from Jan 1 to now
    # ------------------------------------------------------------------

    def get_ytd_kwh(self, plant_id: str, year: int) -> float:
        """
        Returns YTD kWh using monthly aggregates from getPowerStationPointDayMonthYearDataList.
        data_type=4 (Total), query_type=month, p83022=daily_yield summed monthly.
        """
        data = self._post(
            "/openapi/platform/getPowerStationPointDayMonthYearDataList",
            {
                "ps_id_list":        [int(plant_id)],
                "data_point":        "p83022",
                "start_time":        f"{year}01",
                "end_time":          f"{year}12",
                "query_type":        "month",
                "data_type":         "4",
                "order":             0,
                "is_get_point_dict": "1",
            },
        )
        if data.get("result_code") != "1":
            raise ISolarCloudError(f"Monthly energy error: {data}")

        plant_data = data["result_data"].get(str(plant_id)) or data["result_data"].get(plant_id, {})
        frames = plant_data.get("p83022", [])
        total_wh = 0.0
        for frame in frames:
            try:
                total_wh += float(frame.get("4") or 0)
            except (ValueError, TypeError):
                pass
        return round(total_wh / 1000, 1)
