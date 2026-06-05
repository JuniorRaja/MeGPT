import httpx

from config import settings


class PocketBaseService:
    def __init__(self) -> None:
        self.base_url = settings.pocketbase_url
        self._token: str | None = None

    async def _get_token(self) -> str:
        if self._token:
            return self._token
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/admins/auth-with-password",
                json={
                    "identity": settings.pocketbase_admin_email,
                    "password": settings.pocketbase_admin_password,
                },
            )
            resp.raise_for_status()
            self._token = resp.json()["token"]
        return self._token

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
            return None

    async def ensure_session(self, session_id: str) -> None:
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
                        json={"session_id": session_id},
                    )
        except Exception:
            pass

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
