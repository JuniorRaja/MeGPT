import uuid
from typing import Any

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    PointStruct,
    ScoredPoint,
    VectorParams,
)

from config import settings


class QdrantService:
    def __init__(self) -> None:
        self.client = AsyncQdrantClient(url=settings.qdrant_url)
        self.collection = settings.qdrant_collection
        self.dim = settings.embed_dim

    async def ensure_collection(self) -> None:
        existing = await self.client.get_collections()
        names = [c.name for c in existing.collections]
        if self.collection not in names:
            await self.client.create_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(size=self.dim, distance=Distance.COSINE),
            )

    async def upsert(
        self,
        vectors: list[list[float]],
        texts: list[str],
        metadatas: list[dict[str, Any]],
    ) -> int:
        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=vec,
                payload={"text": text, **meta},
            )
            for vec, text, meta in zip(vectors, texts, metadatas)
        ]
        await self.client.upsert(collection_name=self.collection, points=points)
        return len(points)

    async def search(
        self, query_vector: list[float], limit: int = 5
    ) -> list[str]:
        results: list[ScoredPoint] = await self.client.search(
            collection_name=self.collection,
            query_vector=query_vector,
            limit=limit,
            with_payload=True,
        )
        return [hit.payload.get("text", "") for hit in results if hit.payload]


qdrant_service = QdrantService()
