from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()


# ---------------------------------------------------------------------------
# Health check — no auth. Hit by Render health checks and uptime monitors.
# ---------------------------------------------------------------------------

@router.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}
