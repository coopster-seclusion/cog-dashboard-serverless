from fastapi import HTTPException
from services.wits_client import WITSClient

_wits_client: WITSClient | None = None


def get_wits_client() -> WITSClient:
    if _wits_client is None:
        raise HTTPException(status_code=503, detail="WITS client not initialised")
    return _wits_client
