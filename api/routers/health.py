import httpx
from fastapi import APIRouter

from config import settings
from services.qdrant_service import qdrant_service

router = APIRouter()


@router.get("/health")
async def health_check() -> dict:
    checks: dict[str, str] = {}

    try:
        info = await qdrant_service.client.get_collections()
        checks["qdrant"] = f"ok ({len(info.collections)} collections)"
    except Exception as exc:
        checks["qdrant"] = f"error: {exc}"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.litellm_url}/health")
            checks["litellm"] = "ok" if resp.status_code == 200 else f"http {resp.status_code}"
    except Exception as exc:
        checks["litellm"] = f"error: {exc}"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.pocketbase_url}/api/health")
            checks["pocketbase"] = "ok" if resp.status_code == 200 else f"http {resp.status_code}"
    except Exception as exc:
        checks["pocketbase"] = f"error: {exc}"

    all_ok = all("ok" in v for v in checks.values())
    return {"status": "ok" if all_ok else "degraded", "services": checks}
