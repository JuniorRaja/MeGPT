import logging
from datetime import datetime, timezone

import httpx

from config import settings

logger = logging.getLogger(__name__)


class PocketBaseService:
    def __init__(self) -> None:
        self.base_url = settings.pocketbase_url
        self._token: str | None = None

    async def _get_token(self, force: bool = False) -> str:
        if self._token and not force:
            return self._token
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/collections/_superusers/auth-with-password",
                json={
                    "identity": settings.pocketbase_admin_email,
                    "password": settings.pocketbase_admin_password,
                },
            )
            resp.raise_for_status()
            self._token = resp.json()["token"]
        return self._token

    async def _get(self, url: str, **kwargs) -> httpx.Response:
        token = await self._get_token()
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {token}"}, **kwargs)
            if resp.status_code == 401:
                token = await self._get_token(force=True)
                resp = await client.get(url, headers={"Authorization": f"Bearer {token}"}, **kwargs)
            return resp

    async def ensure_schema_fields(self) -> None:
        """Add incognito (sessions) and tokens_in/tokens_out (messages) fields if missing."""
        try:
            token = await self._get_token()

            async def _add_fields(collection: str, needed: list[dict]) -> None:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(
                        f"{self.base_url}/api/collections/{collection}",
                        headers={"Authorization": f"Bearer {token}"},
                    )
                    if resp.status_code != 200:
                        logger.warning("Could not fetch %s schema: %s", collection, resp.status_code)
                        return
                    schema = resp.json()
                    existing = {f["name"] for f in schema.get("fields", [])}
                    to_add = [f for f in needed if f["name"] not in existing]
                    if not to_add:
                        return
                    patch_resp = await client.patch(
                        f"{self.base_url}/api/collections/{collection}",
                        headers={"Authorization": f"Bearer {token}"},
                        json={"fields": schema.get("fields", []) + to_add},
                    )
                    if patch_resp.status_code in (200, 204):
                        logger.info("Added fields to %s: %s", collection, [f["name"] for f in to_add])
                    else:
                        logger.warning(
                            "Failed to patch %s: %s %s", collection, patch_resp.status_code, patch_resp.text
                        )

            await _add_fields("sessions", [
                {"name": "incognito", "type": "bool", "required": False},
            ])
            await _add_fields("messages", [
                {"name": "tokens_in", "type": "number", "required": False},
                {"name": "tokens_out", "type": "number", "required": False},
            ])
        except Exception:
            logger.exception("ensure_schema_fields failed (non-fatal)")

    async def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        model_used: str = "",
        cost_usd: float = 0.0,
        tokens_in: int = 0,
        tokens_out: int = 0,
    ) -> str | None:
        try:
            token = await self._get_token()
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{self.base_url}/api/collections/messages/records",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "session_id": session_id,
                        "role": role,
                        "content": content,
                        "model_used": model_used,
                        "cost_usd": cost_usd,
                        "tokens_in": tokens_in,
                        "tokens_out": tokens_out,
                    },
                )
                resp.raise_for_status()
                return resp.json().get("id")
        except Exception:
            logger.exception("save_message failed")
            return None

    async def ensure_session(self, session_id: str, title: str = "", incognito: bool = False) -> None:
        try:
            token = await self._get_token()
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{self.base_url}/api/collections/sessions/records",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"filter": f'session_id="{session_id}"'},
                )
                data = resp.json()
                if data.get("totalItems", 0) == 0:
                    now = datetime.now(timezone.utc)
                    created_str = now.strftime("%Y-%m-%d %H:%M:%S.") + f"{now.microsecond // 1000:03d}Z"
                    await client.post(
                        f"{self.base_url}/api/collections/sessions/records",
                        headers={"Authorization": f"Bearer {token}"},
                        json={"session_id": session_id, "title": title, "incognito": incognito, "created": created_str},
                    )
        except Exception:
            logger.exception("ensure_session failed")

    async def get_sessions(self, limit: int = 30) -> list[dict]:
        try:
            resp = await self._get(
                f"{self.base_url}/api/collections/sessions/records",
                params={
                    "sort": "-created",
                    "perPage": limit,
                    "page": 1,
                    "filter": "incognito=false",
                },
            )
            resp.raise_for_status()
            items = resp.json().get("items", [])
            logger.info("get_sessions returned %d items", len(items))
            return items
        except Exception as e:
            logger.exception("get_sessions failed: %s", e)
            return []

    async def get_messages(self, session_id: str) -> list[dict]:
        try:
            resp = await self._get(
                f"{self.base_url}/api/collections/messages/records",
                params={
                    "filter": f'session_id="{session_id}"',
                    "sort": "+created",
                    "perPage": 200,
                },
            )
            resp.raise_for_status()
            items = resp.json().get("items", [])
            logger.info("get_messages for %s: %d items", session_id, len(items))
            return items
        except Exception as e:
            logger.exception("get_messages failed: %s", e)
            return []

    async def get_all_stats(self) -> list[dict]:
        """Return lightweight cost/token data for all messages (client-side summing)."""
        try:
            resp = await self._get(
                f"{self.base_url}/api/collections/messages/records",
                params={
                    "perPage": 1000,
                    "page": 1,
                    "fields": "cost_usd,tokens_in,tokens_out",
                },
            )
            resp.raise_for_status()
            return resp.json().get("items", [])
        except Exception as e:
            logger.exception("get_all_stats failed: %s", e)
            return []

    async def save_feedback(
        self, message_id: str, rating: int
    ) -> bool:
        try:
            token = await self._get_token()
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.patch(
                    f"{self.base_url}/api/collections/messages/records/{message_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"feedback": rating},
                )
                resp.raise_for_status()
                return True
        except Exception:
            return False


pocketbase_service = PocketBaseService()
