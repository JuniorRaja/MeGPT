from fastapi import APIRouter, HTTPException, Request

from limiter import limiter
from services.pocketbase_service import pocketbase_service

router = APIRouter()


@router.get("")
@limiter.limit("60/minute")
async def list_sessions(request: Request) -> dict:
    try:
        sessions = await pocketbase_service.get_sessions(limit=30)
        return {"sessions": sessions}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/{session_id}/messages")
@limiter.limit("60/minute")
async def get_session_messages(request: Request, session_id: str) -> dict:
    try:
        messages = await pocketbase_service.get_messages(session_id)
        return {"messages": messages}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
