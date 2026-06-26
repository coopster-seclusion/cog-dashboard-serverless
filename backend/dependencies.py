from fastapi import HTTPException, Request
from services.isolar_cloud import ISolarCloudClient

_isolar_client: ISolarCloudClient | None = None


def get_isolar_client() -> ISolarCloudClient:
    if _isolar_client is None:
        raise HTTPException(status_code=503, detail="iSolarCloud client not initialised")
    return _isolar_client


def require_user(request: Request) -> dict:
    """Gate a route behind a valid Google SSO session. 401 if absent/expired.

    Reads the {email, name, picture} blob set by routers/auth.py from the signed
    session cookie (SessionMiddleware). Used as a router-level dependency on the
    solar data routes; auth routes and /api/health stay public.
    """
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user
