import httpx

from config import settings


class EmbedService:
    async def embed(self, text: str) -> list[float]:
        try:
            return await self._embed_ollama(text)
        except Exception:
            return await self._embed_fallback(text)

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        results = []
        for text in texts:
            results.append(await self.embed(text))
        return results

    async def _embed_ollama(self, text: str) -> list[float]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{settings.ollama_url}/api/embeddings",
                json={"model": settings.embed_model, "prompt": text},
            )
            resp.raise_for_status()
            data = resp.json()
            return data["embedding"]

    async def _embed_fallback(self, text: str) -> list[float]:
        """
        Hash-based pseudo-embedding used only when Ollama is unavailable.
        Produces a deterministic 768-dim unit vector — NOT semantically meaningful.
        Replace with a real fallback (e.g. OpenAI text-embedding-3-small) for production.
        """
        import hashlib
        import math

        digest = hashlib.sha256(text.encode()).digest()
        raw = [((b / 255.0) * 2) - 1 for b in digest]
        repeat = (768 // len(raw)) + 1
        vec = (raw * repeat)[:768]
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [x / norm for x in vec]


embed_service = EmbedService()
