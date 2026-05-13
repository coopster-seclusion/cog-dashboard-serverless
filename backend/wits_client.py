"""
WITS Electricity Market API Client
https://developer.electricityinfo.co.nz/
"""

import time
import requests


# Common NZ grid nodes for easy reference
COMMON_NODES = {
    "Otahuhu (Auckland)": "OTA2201",
    "Haywards (Wellington)": "HAY2201",
    "Islington (Christchurch)": "ISL2201",
    "Benmore (South Island)": "BEN2201",
    "Whakamaru (Waikato)": "WKM2201",
    "Stratford (Taranaki)": "STK0111",
    "Maraetai (Auckland)": "MRT2201",
    "Taupo (Waikato)": "TAU2201",
}

SCHEDULES = ["RTD", "Interim", "Final", "PRSL", "PRSS", "NRSL", "NRSS", "WDS"]
MARKET_TYPES = {"Energy": "E", "Reserves": "R"}

# Confirmed quantity schedules (from Quantities API /schedules discovery, May 2026).
# Energy API also includes RTD and WDS; Reserves API does not include WDS.
# Use get_quantity_schedules() to refresh at runtime.
QUANTITY_ENERGY_SCHEDULES = ["NRSL", "NRSS", "PRSL", "PRSS", "RTD", "WDS"]
QUANTITY_RESERVE_SCHEDULES = ["NRSL", "NRSS", "PRSL", "PRSS", "RTD"]
QUANTITY_SCHEDULES = QUANTITY_ENERGY_SCHEDULES  # default fallback

# Island filter options: display label → API value (None = no filter)
ISLANDS = {"Both Islands": None, "North Island (NI)": "NI", "South Island (SI)": "SI"}

# Reserve run class options for the Quantities API
RESERVE_RUN_CLASSES = ["InstantaneousReserve", "ReserveOffers", "AdjustedReserveOffers"]

# API hard limit for back/forward sliding window (1–48 trading periods)
BACK_FORWARD_MAX = 48

# Per-schedule metadata used to guide query settings in the UI.
# supports_forward: whether this schedule publishes data beyond the current trading period.
# market_prices_window: rough description of the available rolling window.
# market_types: which market types (Energy/Reserves) this schedule carries.
SCHEDULE_METADATA: dict[str, dict] = {
    "RTD": {
        "label": "RTD — Real-Time Dispatch",
        "supports_forward": False,
        "market_types": ["Energy"],
        "description": (
            "Real-time prices. Very short window (~7 periods / ~3.5 h). "
            "Energy only. No forward periods."
        ),
    },
    "Interim": {
        "label": "Interim",
        "supports_forward": False,
        "market_types": ["Energy"],
        "description": (
            "Interim settled prices. Longer history than RTD. Energy only. No forward periods."
        ),
    },
    "Final": {
        "label": "Final",
        "supports_forward": False,
        "market_types": ["Energy"],
        "description": (
            "Final settled prices. Longest available history. Energy only. No forward periods."
        ),
    },
    "PRSL": {
        "label": "PRSL — Pre-dispatch Reserve (Long)",
        "supports_forward": True,
        "market_types": ["Energy", "Reserves"],
        "description": (
            "Pre-dispatch — includes forward lookahead periods. "
            "Supports both Energy and Reserves prices."
        ),
    },
    "PRSS": {
        "label": "PRSS — Pre-dispatch Reserve (Short)",
        "supports_forward": True,
        "market_types": ["Energy", "Reserves"],
        "description": (
            "Shorter pre-dispatch window with forward lookahead. "
            "Supports both Energy and Reserves prices."
        ),
    },
    "NRSL": {
        "label": "NRSL — Near Real-Time Reserve (Long)",
        "supports_forward": True,
        "market_types": ["Energy", "Reserves"],
        "description": (
            "Near real-time schedule with forward lookahead. "
            "Supports both Energy and Reserves prices."
        ),
    },
    "NRSS": {
        "label": "NRSS — Near Real-Time Reserve (Short)",
        "supports_forward": True,
        "market_types": ["Energy", "Reserves"],
        "description": (
            "Shorter near real-time window with forward lookahead. "
            "Supports both Energy and Reserves prices."
        ),
    },
    "WDS": {
        "label": "WDS — Week-ahead Dispatch Schedule",
        "supports_forward": True,
        "market_types": ["Energy"],
        "description": (
            "Week-ahead forecast including forward periods up to ~one week ahead. "
            "Energy only."
        ),
    },
}

TOKEN_URL = "https://api.electricityinfo.co.nz/login/oauth2/token"
PRICES_BASE_URL = "https://api.electricityinfo.co.nz/api/market-prices/v1"
QUANTITIES_BASE_URL = "https://api.electricityinfo.co.nz/api/quantities/v1"

# Keep old alias for backward compatibility
BASE_URL = PRICES_BASE_URL


class WITSClient:
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self._token: str | None = None
        self._token_expiry: float = 0

    # ------------------------------------------------------------------
    # Auth
    # ------------------------------------------------------------------
    def _fetch_token(self) -> str:
        resp = requests.post(
            TOKEN_URL,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

        if "access_token" not in data:
            raise ValueError(f"Auth failed: {data}")

        self._token = data["access_token"]
        # Tokens typically last 3600s; refresh 60s early to be safe
        expires_in = data.get("expires_in", 3600)
        self._token_expiry = time.time() + expires_in - 60
        return self._token

    @property
    def token(self) -> str:
        if self._token is None or time.time() >= self._token_expiry:
            self._fetch_token()
        return self._token

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _auth_headers(self) -> dict:
        return {"Authorization": f"Bearer {self.token}"}

    @staticmethod
    def _extract(obj, key: str) -> list:
        """Recursively pull all values for a given key from nested JSON."""
        results = []

        def _walk(node):
            if isinstance(node, dict):
                for k, v in node.items():
                    if k == key:
                        results.append(v)
                    else:
                        _walk(v)
            elif isinstance(node, list):
                for item in node:
                    _walk(item)

        _walk(obj)
        return results

    def _build_range_params(
        self,
        back: int | None,
        forward: int | None,
        from_dt: str | None,
        to_dt: str | None,
    ) -> dict:
        """
        Build validated time-range query params.

        back/forward (sliding window) and from_dt/to_dt (absolute range) are mutually
        exclusive per the API spec.
        """
        params = {}
        using_sliding = back is not None or forward is not None
        using_absolute = from_dt is not None or to_dt is not None

        if using_sliding and using_absolute:
            raise ValueError(
                "Cannot mix back/forward with from/to parameters. "
                "Use one range mode at a time."
            )

        if using_sliding:
            if back is not None:
                params["back"] = back
            if forward is not None:
                params["forward"] = forward
        elif using_absolute:
            if from_dt is not None:
                params["from"] = from_dt
            if to_dt is not None:
                params["to"] = to_dt

        return params

    # ------------------------------------------------------------------
    # Schedules
    # ------------------------------------------------------------------
    def get_schedules(self) -> list[dict]:
        """Return available market price schedules from the API."""
        resp = requests.get(
            f"{PRICES_BASE_URL}/schedules",
            headers=self._auth_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    def get_quantity_schedules(self) -> dict:
        """
        Return available schedules from the Quantities API.
        Response: {"energySchedules": [...], "reserveSchedules": [...]}
        """
        resp = requests.get(
            f"{QUANTITIES_BASE_URL}/schedules",
            headers=self._auth_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    # ------------------------------------------------------------------
    # Market Prices
    # ------------------------------------------------------------------
    def get_spot_prices(
        self,
        schedule: str,
        market_type: str,
        nodes: list[str] | str | None = None,
        back: int | None = 48,
        forward: int | None = None,
        from_dt: str | None = None,
        to_dt: str | None = None,
        island: str | None = None,
        offset: int = 0,
    ) -> dict:
        """
        Fetch spot prices from the Market Prices API.

        Returns:
            {
                "prices": [float, ...],
                "timestamps": [str, ...],
                "raw": <full API response>
            }

        Args:
            schedule:    e.g. "RTD", "Interim", "Final"
            market_type: "E" for Energy, "R" for Reserves
            nodes:       single node string or list (comma-joined); omit for all nodes
            back:        trading periods before current (1–48); mutually exclusive with from_dt/to_dt
            forward:     trading periods ahead of current (1–48); mutually exclusive with from_dt/to_dt
            from_dt:     RFC3339 datetime, e.g. "2024-01-01T00:00:00+12:00"
            to_dt:       RFC3339 datetime
            island:      "NI" or "SI" to restrict to one island
            offset:      pagination offset (multiples of 10,000; max 10,000 records per call)
        """
        params: dict = {"marketType": market_type, "offset": offset}

        if nodes is not None:
            params["nodes"] = ",".join(nodes) if isinstance(nodes, list) else nodes

        if island:
            params["island"] = island

        params.update(self._build_range_params(back, forward, from_dt, to_dt))

        url = f"{PRICES_BASE_URL}/schedules/{schedule}/prices"
        resp = requests.get(url, headers=self._auth_headers(), params=params, timeout=15)
        resp.raise_for_status()
        raw = resp.json()

        return {
            "prices": self._extract(raw, "price"),
            "timestamps": self._extract(raw, "tradingDateTime"),
            "raw": raw,
        }

    def get_prices_by_node(
        self,
        schedule: str,
        market_type: str,
        nodes: list[str],
        back: int | None = 48,
        forward: int | None = None,
        from_dt: str | None = None,
        to_dt: str | None = None,
        island: str | None = None,
    ) -> dict[str, dict]:
        """
        Fetch prices for multiple nodes in a single API call and return a per-node dict.

        Returns:
            {
                "OTA2201": {"prices": [...], "timestamps": [...]},
                "HAY2201": {"prices": [...], "timestamps": [...]},
                ...
            }
        """
        try:
            data = self.get_spot_prices(
                schedule, market_type, nodes,
                back, forward, from_dt, to_dt, island,
            )
        except Exception as e:
            return {node: {"error": str(e), "prices": [], "timestamps": []} for node in nodes}

        result: dict[str, dict] = {node: {"prices": [], "timestamps": []} for node in nodes}

        raw = data["raw"]

        # Try multiple common field names for the node identifier, using the same
        # recursive _extract used for prices/timestamps so response structure doesn't matter.
        raw_node_ids: list = []
        for field in ("node", "nodeId", "poc", "pointOfConnection", "pricingNode"):
            raw_node_ids = [str(n).strip() for n in self._extract(raw, field) if n]
            if raw_node_ids:
                break

        raw_prices     = data["prices"]
        raw_timestamps = data["timestamps"]

        if raw_node_ids and len(raw_node_ids) == len(raw_prices) == len(raw_timestamps):
            for node_id, price, ts in zip(raw_node_ids, raw_prices, raw_timestamps):
                if node_id in result:
                    result[node_id]["prices"].append(price)
                    result[node_id]["timestamps"].append(ts)
        else:
            # Fallback: walk the raw "prices" array directly with per-record node matching.
            for rec in (raw.get("prices") or []):
                if isinstance(rec, dict):
                    node_id = str(rec.get("node") or rec.get("nodeId") or "").strip()
                    if node_id in result:
                        result[node_id]["prices"].append(rec.get("price"))
                        result[node_id]["timestamps"].append(rec.get("tradingDateTime"))

        return result

    # ------------------------------------------------------------------
    # Energy Quantities
    # ------------------------------------------------------------------
    def get_energy_quantities(
        self,
        schedule: str,
        back: int | None = 24,
        forward: int | None = None,
        from_dt: str | None = None,
        to_dt: str | None = None,
        island: str | None = None,
    ) -> dict:
        """
        Fetch energy quantities from the Quantities API.

        Response contains energyQuantities with fields:
        tradingDateTime, tradingPeriod, island, load, generation,
        intermittentGeneration, totalBids, totalOffers, intermittentOffers

        Rolling window: -24 to +24 TP around current period.
        """
        params: dict = {}
        if island:
            params["island"] = island
        params.update(self._build_range_params(back, forward, from_dt, to_dt))

        url = f"{QUANTITIES_BASE_URL}/schedules/{schedule}/energy"
        resp = requests.get(url, headers=self._auth_headers(), params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()

    # ------------------------------------------------------------------
    # Reserve Quantities
    # ------------------------------------------------------------------
    def get_reserve_quantities(
        self,
        schedule: str,
        run_class: str,
        back: int | None = 24,
        forward: int | None = None,
        from_dt: str | None = None,
        to_dt: str | None = None,
        island: str | None = None,
    ) -> dict:
        """
        Fetch reserve quantities from the Quantities API.

        Args:
            run_class: one of "InstantaneousReserve", "ReserveOffers", "AdjustedReserveOffers"

        Response contains reserveQuantities with fields:
        tradingDateTime, tradingPeriod, island, runType, reserveClass,
        runClass, price, reserveMw, riskMw, riskAdjustmentFactor

        Rolling window: -24 to +24 TP around current period.
        """
        if run_class not in RESERVE_RUN_CLASSES:
            raise ValueError(
                f"run_class must be one of {RESERVE_RUN_CLASSES}, got '{run_class}'"
            )

        params: dict = {"runClass": run_class}
        if island:
            params["island"] = island
        params.update(self._build_range_params(back, forward, from_dt, to_dt))

        url = f"{QUANTITIES_BASE_URL}/schedules/{schedule}/reserves"
        resp = requests.get(url, headers=self._auth_headers(), params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()
