import logging

import httpx

from config import settings

logger = logging.getLogger(__name__)


class TelegramService:
    async def send(self, text: str) -> None:
        if not settings.telegram_bot_token or not settings.telegram_chat_id:
            return
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                await client.post(
                    f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
                    json={
                        "chat_id": settings.telegram_chat_id,
                        "text": text,
                        "parse_mode": "HTML",
                    },
                )
        except Exception:
            logger.exception("Telegram send failed")

    async def send_feedback_alert(
        self, rating: int, question: str, answer: str, session_id: str = ""
    ) -> None:
        q = (question or "")[:150].strip()
        a = (answer or "")[:150].strip()
        if rating == 1:
            text = f"👍 <b>Great answer on MeGPT</b>\n\n<b>Q:</b> {q}\n<b>A:</b> {a}"
        else:
            sid_line = f"\n<b>Session:</b> <code>{session_id}</code>" if session_id else ""
            text = (
                f"👎 <b>Bad answer — needs improvement</b>\n\n"
                f"<b>Q:</b> {q}\n<b>A:</b> {a}\n\n"
                f"→ Review and update knowledge base{sid_line}"
            )
        await self.send(text)


telegram_service = TelegramService()
