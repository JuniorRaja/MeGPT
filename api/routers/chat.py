import json

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from config import settings
from limiter import limiter
from models.chat import ChatRequest, ChatResponse
from services.embed_service import embed_service
from services.litellm_service import estimate_cost, litellm_service
from services.pocketbase_service import pocketbase_service
from services.qdrant_service import qdrant_service

router = APIRouter()

SYSTEM_PROMPT = """You are SelfGPT — the digital twin of Prasanna Rajendran (PR).

Personality: sharp, warm, a little cheeky. Think fast, write short.
Default: 2-3 sentences. Only go longer if the question genuinely needs depth.
No bullet lists unless asked. Write like a smart human texts, not a report.

Scope: only talk about PR — his work, stack, projects, opinions, travel, life.
Out-of-scope questions get a clever one-liner redirect. Stay in character, always.

When context from PR's knowledge base is provided, use it accurately.
If context doesn't cover the question, say so briefly and honestly."""


def _build_messages(message: str, context_block: str) -> list[dict]:
    system_content = SYSTEM_PROMPT
    if context_block:
        system_content += f"\n\n---\nContext from PR's knowledge base:\n{context_block}\n---"
    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": message},
    ]


@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
@limiter.limit("20/minute")
async def chat(request: Request, req: ChatRequest) -> ChatResponse:
    await pocketbase_service.ensure_session(
        req.session_id, title=req.title or req.message[:60]
    )
    await pocketbase_service.save_message(
        session_id=req.session_id,
        role="user",
        content=req.message,
    )

    query_vector = await embed_service.embed(req.message)
    chunks = await qdrant_service.search(query_vector, limit=5)
    context_block = "\n\n".join(f"[{i+1}] {c}" for i, c in enumerate(chunks) if c)

    messages = _build_messages(req.message, context_block)
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


@router.post("/stream")
@limiter.limit("20/minute")
async def chat_stream(request: Request, req: ChatRequest) -> StreamingResponse:
    await pocketbase_service.ensure_session(
        req.session_id, title=req.title or req.message[:60]
    )
    await pocketbase_service.save_message(
        session_id=req.session_id,
        role="user",
        content=req.message,
    )

    query_vector = await embed_service.embed(req.message)
    chunks = await qdrant_service.search(query_vector, limit=5)
    context_block = "\n\n".join(f"[{i+1}] {c}" for i, c in enumerate(chunks) if c)

    messages = _build_messages(req.message, context_block)
    model = req.model or settings.default_model
    input_text = " ".join(m.get("content", "") for m in messages)
    collected: list[str] = []

    async def event_stream():
        try:
            async for token in litellm_service.stream(messages=messages, model=model):
                collected.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
            return

        full_content = "".join(collected)
        cost_usd = estimate_cost(model, input_text, full_content)

        await pocketbase_service.save_message(
            session_id=req.session_id,
            role="assistant",
            content=full_content,
            model_used=model,
            cost_usd=cost_usd,
        )
        yield f"data: {json.dumps({'done': True, 'session_id': req.session_id, 'model_used': model, 'cost_usd': cost_usd})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
