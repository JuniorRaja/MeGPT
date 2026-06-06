import logging

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

    async def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        model_used: str = "",
        cost_usd: float = 0.0,
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
                    },
                )
                resp.raise_for_status()
                return resp.json().get("id")
        except Exception:
            logger.exception("save_message failed")
            return None

    async def ensure_session(self, session_id: str, title: str = "") -> None:
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
                    await client.post(
                        f"{self.base_url}/api/collections/sessions/records",
                        headers={"Authorization": f"Bearer {token}"},
                        json={"session_id": session_id, "title": title},
                    )
        except Exception:
            logger.exception("ensure_session failed")

    async def get_sessions(self, limit: int = 30) -> list[dict]:
        try:
            resp = await self._get(
                f"{self.base_url}/api/collections/sessions/records",
                params={"sort": "-id", "perPage": limit, "page": 1},
            )
            resp.raise_for_status()
            return resp.json().get("items", [])
        except Exception:
            return []

    async def get_messages(self, session_id: str) -> list[dict]:
        try:
            resp = await self._get(
                f"{self.base_url}/api/collections/messages/records",
                params={
                    "filter": f'session_id="{session_id}"',
                    "sort": "+id",
                    "perPage": 200,
                },
            )
            resp.raise_for_status()
            return resp.json().get("items", [])
        except Exception:
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
