import logging

from fastapi import APIRouter, BackgroundTasks, Request
from pydantic import BaseModel

from limiter import limiter
from services.pocketbase_service import pocketbase_service
from services.telegram_service import telegram_service

router = APIRouter()
logger = logging.getLogger(__name__)


class FeedbackRequest(BaseModel):
    rating: int       # 1 or -1
    question: str = ""
    answer: str = ""
    session_id: str = ""


@router.post("/{message_id}")
@limiter.limit("30/minute")
async def submit_feedback(
    request: Request,
    message_id: str,
    body: FeedbackRequest,
    background_tasks: BackgroundTasks,
) -> dict:
    logger.info(
        "feedback %s | rating=%s | q_len=%d | a_len=%d",
        message_id, body.rating, len(body.question), len(body.answer),
    )
    await pocketbase_service.save_feedback(message_id, body.rating)
    background_tasks.add_task(
        telegram_service.send_feedback_alert,
        body.rating, body.question, body.answer, body.session_id,
    )
    return {"ok": True}
