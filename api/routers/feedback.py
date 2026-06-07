from fastapi import APIRouter, Request
from pydantic import BaseModel

from limiter import limiter
from services.pocketbase_service import pocketbase_service

router = APIRouter()


class FeedbackRequest(BaseModel):
    rating: int  # 1 or -1


@router.post("/{message_id}")
@limiter.limit("30/minute")
async def submit_feedback(request: Request, message_id: str, body: FeedbackRequest) -> dict:
    await pocketbase_service.save_feedback(message_id, body.rating)
    return {"ok": True}
