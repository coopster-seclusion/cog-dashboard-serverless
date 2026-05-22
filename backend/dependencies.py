from fastapi import HTTPException
from services.wits_client import WITSClient
from services.isolar_cloud import ISolarCloudClient

_wits_client: WITSClient | None = None
_isolar_client: ISolarCloudClient | None = None


def get_wits_client() -> WITSClient:
    if _wits_client is None:
        raise HTTPException(status_code=503, detail="WITS client not initialised")
    return _wits_client


def get_isolar_client() -> ISolarCloudClient:
    if _isolar_client is None:
        raise HTTPException(status_code=503, detail="iSolarCloud client not initialised")
    return _isolar_client
