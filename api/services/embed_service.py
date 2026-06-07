import asyncio

from fastembed import TextEmbedding

from config import settings


class EmbedService:
    def __init__(self) -> None:
        self._model = TextEmbedding(model_name=settings.embed_model)

    async def embed(self, text: str) -> list[float]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, lambda: list(self._model.embed([text]))[0].tolist()
        )

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, lambda: [v.tolist() for v in self._model.embed(texts)]
        )


embed_service = EmbedService()
