"""
Google SSO (OpenID Connect) — gates the dashboard behind COG Google accounts.

The backend runs the whole OAuth2/OIDC flow (the browser never holds the client
secret), mirroring the pattern used for iSolarCloud. On success we store a tiny
{email, name, picture} blob in a signed session cookie (Starlette
SessionMiddleware); there is no session table.

Access control: only Google accounts whose verified email is in ALLOWED_DOMAIN
(COG's Google Workspace domain, e.g. cognz.com) may sign in. An explicit
ALLOWED_EMAILS list is also honoured. If neither is configured the gate fails
closed (nobody gets in) so a misconfiguration can't silently open the dashboard.
"""

import logging
import os

from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

_log = logging.getLogger(__name__)

router = APIRouter()

GOOGLE_CONF_URL = "https://accounts.google.com/.well-known/openid-configuration"

_oauth = OAuth()
_registered = False


# ---------------------------------------------------------------------------
# Config helpers (read at call time so .env / Render env vars are picked up)
# ---------------------------------------------------------------------------

def _public_base_url() -> str:
    # In local dev this is the Vite origin (http://localhost:5173); Vite proxies
    # /api to the backend, so the browser stays same-origin and the session
    # cookie round-trips. In prod it's the Render URL (SPA + API same origin).
    return os.getenv("PUBLIC_BASE_URL", "http://localhost:5173").rstrip("/")


def _redirect_uri() -> str:
    return f"{_public_base_url()}/api/auth/google/callback"


def _allowed_domain() -> str | None:
    d = os.getenv("ALLOWED_DOMAIN")
    return d.strip().lower() if d and d.strip() else None


def _allowed_emails() -> set[str]:
    raw = os.getenv("ALLOWED_EMAILS", "")
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def _get_google():
    """Lazily register the Google OIDC client (env isn't loaded at import time)."""
    global _registered
    if not _registered:
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        if not client_id or not client_secret:
            raise HTTPException(
                status_code=503,
                detail="Google SSO not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET unset).",
            )
        _oauth.register(
            name="google",
            server_metadata_url=GOOGLE_CONF_URL,
            client_id=client_id,
            client_secret=client_secret,
            client_kwargs={"scope": "openid email profile"},
        )
        _registered = True
    return _oauth.google


def _is_allowed(email: str, email_verified: bool, hd: str | None) -> bool:
    """Allow only verified COG accounts. Fail closed if no allowlist configured."""
    if not email or not email_verified:
        return False
    domain = _allowed_domain()
    emails = _allowed_emails()
    email_domain = email.rsplit("@", 1)[-1].lower()

    if domain and email_domain == domain:
        # Google Workspace also sends the hosted-domain (hd) claim; log a
        # mismatch but treat the verified email domain as the real gate.
        if hd and hd.lower() != domain:
            _log.warning("Sign-in %s: hd=%s != ALLOWED_DOMAIN=%s", email, hd, domain)
        return True
    if emails and email in emails:
        return True
    return False


# ---------------------------------------------------------------------------
# Routes — all public (the gate is what they enforce). Mounted at /api/auth.
# ---------------------------------------------------------------------------

@router.get("/google/login")
async def google_login(request: Request):
    """Kick off the OAuth2 consent flow — redirects the browser to Google."""
    google = _get_google()
    kwargs = {}
    domain = _allowed_domain()
    if domain:
        kwargs["hd"] = domain  # hints Google to pre-select the COG Workspace
    return await google.authorize_redirect(request, _redirect_uri(), **kwargs)


@router.get("/google/callback")
async def google_callback(request: Request):
    """Google redirects here with ?code=... — verify, check allowlist, set session."""
    google = _get_google()
    try:
        token = await google.authorize_access_token(request)
    except OAuthError as exc:
        _log.warning("Google OAuth error: %s", exc)
        return RedirectResponse("/?error=oauth")

    userinfo = token.get("userinfo") or {}
    email = (userinfo.get("email") or "").lower()
    if not _is_allowed(email, userinfo.get("email_verified", False), userinfo.get("hd")):
        _log.warning("Rejected sign-in for %r (hd=%s)", email, userinfo.get("hd"))
        return RedirectResponse("/?error=unauthorized")

    request.session["user"] = {
        "email": email,
        "name": userinfo.get("name"),
        "picture": userinfo.get("picture"),
    }
    _log.info("Signed in: %s", email)
    return RedirectResponse("/")


@router.get("/me")
async def me(request: Request):
    """Return the signed-in user, or 401. Polled by the frontend on load."""
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.post("/logout")
async def logout(request: Request):
    request.session.pop("user", None)
    return {"detail": "Logged out"}
