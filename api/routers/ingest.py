import re

from fastapi import APIRouter, HTTPException, Request, status

from limiter import limiter
from models.ingest import IngestRequest, IngestResponse
from services.embed_service import embed_service
from services.qdrant_service import qdrant_service

router = APIRouter()

CHUNK_TOKENS = 500
OVERLAP_TOKENS = 50


def _split_into_chunks(text: str, chunk_size: int = CHUNK_TOKENS, overlap: int = OVERLAP_TOKENS) -> list[str]:
    """Split text into overlapping word-token chunks."""
    words = re.split(r"\s+", text.strip())
    if not words:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        if chunk:
            chunks.append(chunk)
        if end == len(words):
            break
        start += chunk_size - overlap
    return chunks


@router.post("", response_model=IngestResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("120/minute")
async def ingest(request: Request, req: IngestRequest) -> IngestResponse:
    chunks = _split_into_chunks(req.text)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Text produced no chunks after splitting.",
        )

    try:
        vectors = await embed_service.embed_batch(chunks)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Embedding failed: {exc}",
        )

    metadatas = [
        {"source": req.source, "category": req.category, "chunk_index": i}
        for i in range(len(chunks))
    ]

    try:
        count = await qdrant_service.upsert(vectors=vectors, texts=chunks, metadatas=metadatas)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Qdrant upsert failed: {exc}",
        )

    return IngestResponse(
        chunks_created=count,
        source=req.source,
        category=req.category,
    )


@router.get("/count")
async def vector_count() -> dict:
    count = await qdrant_service.count()
    return {"collection": qdrant_service.collection, "vectors": count}
