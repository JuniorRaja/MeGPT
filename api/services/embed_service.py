import httpx

from config import settings


class EmbedService:
    async def embed(self, text: str) -> list[float]:
        return await self._embed_ollama(text)

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        results = []
        for text in texts:
            results.append(await self.embed(text))
        return results

    async def _embed_ollama(self, text: str) -> list[float]:
        """
        Tries the Ollama >=0.1.26 /api/embed endpoint first,
        falls back to the legacy /api/embeddings endpoint for older installs.
        Raises on failure so bad embeddings never silently enter Qdrant.
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            # New API (Ollama >=0.1.26)
            try:
                resp = await client.post(
                    f"{settings.ollama_url}/api/embed",
                    json={"model": settings.embed_model, "input": text},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    vec = data.get("embeddings", [None])[0]
                    if vec:
                        return vec
            except httpx.RequestError:
                pass

            # Legacy API (Ollama <0.1.26)
            resp = await client.post(
                f"{settings.ollama_url}/api/embeddings",
                json={"model": settings.embed_model, "prompt": text},
            )
            resp.raise_for_status()
            vec = resp.json().get("embedding")
            if not vec:
                raise ValueError("Ollama returned empty embedding")
            return vec


embed_service = EmbedService()
