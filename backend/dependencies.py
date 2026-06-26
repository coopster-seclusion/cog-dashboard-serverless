from fastapi import HTTPException
from services.isolar_cloud import ISolarCloudClient

_isolar_client: ISolarCloudClient | None = None


def get_isolar_client() -> ISolarCloudClient:
    if _isolar_client is None:
        raise HTTPException(status_code=503, detail="iSolarCloud client not initialised")
    return _isolar_client
