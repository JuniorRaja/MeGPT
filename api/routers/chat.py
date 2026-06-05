from fastapi import APIRouter, HTTPException, status

from config import settings
from models.chat import ChatRequest, ChatResponse
from services.embed_service import embed_service
from services.litellm_service import litellm_service
from services.pocketbase_service import pocketbase_service
from services.qdrant_service import qdrant_service

router = APIRouter()

SYSTEM_PROMPT = """You are SelfGPT, the digital twin of Prasanna Rajendran.
You are witty, warm, direct, and smart. You only answer about PR — his work, skills, projects, travel, interests.
If asked anything else, redirect cleverly. Never break character.
Use the context below (if provided) to answer accurately. If the context doesn't cover the question, say so honestly but stay in character."""


@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat(req: ChatRequest) -> ChatResponse:
    await pocketbase_service.ensure_session(req.session_id)
    await pocketbase_service.save_message(
        session_id=req.session_id,
        role="user",
        content=req.message,
    )

    query_vector = await embed_service.embed(req.message)

    chunks = await qdrant_service.search(query_vector, limit=5)
    context_block = "\n\n".join(f"[{i+1}] {c}" for i, c in enumerate(chunks) if c)

    system_content = SYSTEM_PROMPT
    if context_block:
        system_content += f"\n\n---\nContext from PR's knowledge base:\n{context_block}\n---"

    messages = [
        {"role": "system", "content": system_content},
        {"role": "user", "content": req.message},
    ]

    model = req.model or settings.default_model
    try:
        llm_resp = await litellm_service.chat(messages=messages, model=model)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM call failed: {exc}",
        )

    await pocketbase_service.save_message(
        session_id=req.session_id,
        role="assistant",
        content=llm_resp.content,
        model_used=llm_resp.model,
        cost_usd=llm_resp.cost_usd,
    )

    return ChatResponse(
        response=llm_resp.content,
        session_id=req.session_id,
        model_used=llm_resp.model,
        cost_usd=llm_resp.cost_usd,
        sources=[c[:120] for c in chunks if c],
    )
