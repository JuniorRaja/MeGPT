import uuid
from typing import Any

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
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

    async def search(self, query_vector: list[float], limit: int = 5) -> list[str]:
        results = await self.client.search(
            collection_name=self.collection,
            query_vector=query_vector,
            limit=limit,
            with_payload=True,
        )
        return [
            hit.payload.get("text", "")
            for hit in results
            if hit.payload
        ]

    async def search_with_scores(
        self,
        query_vector: list[float],
        limit: int = 15,
        category_filter: str | None = None,
    ) -> list[tuple[str, float, dict]]:
        query_filter = None
        if category_filter is not None and category_filter != "general":
            query_filter = Filter(
                must=[
                    FieldCondition(
                        key="category",
                        match=MatchValue(value=category_filter),
                    )
                ]
            )
        results = await self.client.search(
            collection_name=self.collection,
            query_vector=query_vector,
            limit=limit,
            with_payload=True,
            query_filter=query_filter,
        )
        hits = [
            (
                hit.payload.get("text", ""),
                hit.score,
                {
                    "source": hit.payload.get("source", ""),
                    "category": hit.payload.get("category", ""),
                },
            )
            for hit in results
            if hit.payload and hit.payload.get("text", "")
        ]
        hits.sort(key=lambda t: t[1], reverse=True)
        return hits

    async def count(self) -> int:
        info = await self.client.get_collection(self.collection)
        return info.points_count or 0


qdrant_service = QdrantService()
