import json

import httpx
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse

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

# Models that run on Groq (subject to rate limits)
_GROQ_MODELS = {"selfgpt-turbo", "selfgpt-free"}
# Fallback when Groq rate-limits us
_GROQ_FALLBACK = "selfgpt-smart"

# Keywords that bump routing up a tier
_DEEP_KEYWORDS = {"in detail", "comprehensive", "deep dive", "elaborate", "thorough", "everything about", "full breakdown"}
_SMART_KEYWORDS = {"compare", "analyze", "analyse", "what do you think", "opinion", "philosophy", "approach to", "how would you", "pros and cons", "trade-off", "tradeoff", "why do you"}
_TURBO_PHRASES = {"hi", "hey", "hello", "thanks", "thank you", "ok", "okay", "cool", "nice", "got it", "sure"}


def _route_model(message: str, requested: str | None) -> str:
    """Pick the best model unless the caller explicitly chose one."""
    if requested:
        return requested

    text = message.lower().strip()
    words = text.split()

    # Trivial greetings / acks → fastest model
    if len(words) <= 4 and text in _TURBO_PHRASES or text.rstrip("!.,?") in _TURBO_PHRASES:
        return "selfgpt-turbo"

    # Explicit depth request or very long message → sonnet
    if any(kw in text for kw in _DEEP_KEYWORDS) or len(words) > 60:
        return "selfgpt-deep"

    # Analytical / opinion questions → haiku
    if any(kw in text for kw in _SMART_KEYWORDS) or len(words) > 25:
        return "selfgpt-smart"

    # Default: groq 70b
    return "selfgpt-free"


def _build_messages(message: str, context_block: str, history: list[dict]) -> list[dict]:
    system_content = SYSTEM_PROMPT
    if context_block:
        system_content += f"\n\n---\nContext from PR's knowledge base:\n{context_block}\n---"

    msgs: list[dict] = [{"role": "system", "content": system_content}]
    msgs.extend(history)
    msgs.append({"role": "user", "content": message})
    return msgs


async def _load_history(session_id: str, limit: int = 10) -> list[dict]:
    """Return the last `limit` messages from the session as LLM-ready dicts."""
    records = await pocketbase_service.get_messages(session_id)
    # Take the most recent `limit` messages (excluding the current turn not yet saved)
    recent = records[-limit:] if len(records) > limit else records
    return [{"role": r["role"], "content": r["content"]} for r in recent]


@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
@limiter.limit("20/minute")
async def chat(request: Request, req: ChatRequest) -> ChatResponse:
    await pocketbase_service.ensure_session(
        req.session_id, title=req.title or req.message[:60]
    )
    # Load history BEFORE saving the current message so it isn't duplicated
    history = await _load_history(req.session_id)
    await pocketbase_service.save_message(
        session_id=req.session_id,
        role="user",
        content=req.message,
    )

    query_vector = await embed_service.embed(req.message)
    chunks = await qdrant_service.search(query_vector, limit=5)
    context_block = "\n\n".join(f"[{i+1}] {c}" for i, c in enumerate(chunks) if c)

    messages = _build_messages(req.message, context_block, history)
    model = _route_model(req.message, req.model)

    try:
        llm_resp = await litellm_service.chat(messages=messages, model=model)
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 429 and model in _GROQ_MODELS:
            model = _GROQ_FALLBACK
            try:
                llm_resp = await litellm_service.chat(messages=messages, model=model)
            except Exception as fallback_exc:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM call failed: {fallback_exc}")
        else:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM call failed: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM call failed: {exc}")

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
    # Load history BEFORE saving the current message so it isn't duplicated
    history = await _load_history(req.session_id)
    await pocketbase_service.save_message(
        session_id=req.session_id,
        role="user",
        content=req.message,
    )

    query_vector = await embed_service.embed(req.message)
    chunks = await qdrant_service.search(query_vector, limit=5)
    context_block = "\n\n".join(f"[{i+1}] {c}" for i, c in enumerate(chunks) if c)

    messages = _build_messages(req.message, context_block, history)
    model = _route_model(req.message, req.model)
    input_text = " ".join(m.get("content", "") for m in messages)
    collected: list[str] = []

    async def event_stream():
        nonlocal model
        try:
            async for token in litellm_service.stream(messages=messages, model=model):
                collected.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 429 and model in _GROQ_MODELS:
                # Groq rate limit — fall back and re-stream from scratch
                model = _GROQ_FALLBACK
                collected.clear()
                yield f"data: {json.dumps({'notice': 'rate_limit_fallback', 'model': model})}\n\n"
                try:
                    async for token in litellm_service.stream(messages=messages, model=model):
                        collected.append(token)
                        yield f"data: {json.dumps({'token': token})}\n\n"
                except Exception as fallback_exc:
                    yield f"data: {json.dumps({'error': str(fallback_exc)})}\n\n"
                    return
            else:
                yield f"data: {json.dumps({'error': str(exc)})}\n\n"
                return
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
