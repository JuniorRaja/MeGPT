import asyncio
import json
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from limiter import limiter
from models.chat import ChatRequest, ChatResponse
from services.embed_service import embed_service
from services.litellm_service import _JUDGE_MODEL, _compute_cost, estimate_cost, groq_remaining_requests, judge_message, litellm_service
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

# Groq fallback chains — ordered by preference within each tier.
_GROQ_FAST_CHAIN = ["llama-3.1-8b-instant", "allam-2-7b"]
_GROQ_DEFAULT_CHAIN = [
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "qwen/qwen3-32b",
]

_CLAUDE_HAIKU = "claude-haiku-4-5-20251001"
_CLAUDE_SONNET = "claude-sonnet-4-5-20251001"

_DEEP_KEYWORDS = {"in detail", "comprehensive", "deep dive", "elaborate", "thorough", "everything about", "full breakdown"}
_SMART_KEYWORDS = {"compare", "analyze", "analyse", "what do you think", "opinion", "philosophy", "approach to", "how would you", "pros and cons", "trade-off", "tradeoff", "why do you"}
_TURBO_PHRASES = {"hi", "hey", "hello", "thanks", "thank you", "ok", "okay", "cool", "nice", "got it", "sure"}

_AUTO_ROUTE_ALIASES = {"selfgpt-free", "selfgpt-pro", "auto", "default"}

_KNOWN_MODELS = {
    *_GROQ_FAST_CHAIN,
    *_GROQ_DEFAULT_CHAIN,
    _CLAUDE_HAIKU,
    _CLAUDE_SONNET,
}

_SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


def _route_model(message: str, requested: str | None) -> str:
    """Pick the best model unless the caller explicitly chose a known model."""
    if requested and requested not in _AUTO_ROUTE_ALIASES and requested in _KNOWN_MODELS:
        return requested

    text = message.lower().strip()
    words = text.split()

    if len(words) <= 4 and text in _TURBO_PHRASES or text.rstrip("!.,?") in _TURBO_PHRASES:
        return "llama-3.1-8b-instant"

    if any(kw in text for kw in _DEEP_KEYWORDS) or len(words) > 60:
        return "llama-3.3-70b-versatile"

    if any(kw in text for kw in _SMART_KEYWORDS) or len(words) > 25:
        return "qwen/qwen3-32b"

    return "llama-3.3-70b-versatile"


def _get_fallback_chain(model: str) -> list[str]:
    """Return ordered list of models to attempt, skipping any with 0 known remaining requests."""
    for chain in (_GROQ_FAST_CHAIN, _GROQ_DEFAULT_CHAIN):
        if model in chain:
            candidates = chain[chain.index(model):]
            available = [m for m in candidates if (groq_remaining_requests(m) or 1) > 0]
            return available if available else [chain[-1]]
    return [model]


_IST = timezone(timedelta(hours=5, minutes=30))


def _build_messages(message: str, context_block: str, history: list[dict]) -> list[dict]:
    now = datetime.now(_IST)
    date_line = f"Current date and time: {now.strftime('%A, %d %B %Y, %H:%M IST')}."
    system_content = SYSTEM_PROMPT + f"\n\n{date_line}"
    if context_block:
        system_content += f"\n\n---\nContext from PR's knowledge base:\n{context_block}\n---"

    msgs: list[dict] = [{"role": "system", "content": system_content}]
    msgs.extend(history)
    msgs.append({"role": "user", "content": message})
    return msgs


async def _load_history(session_id: str, limit: int = 10) -> list[dict]:
    """Return the last `limit` messages from the session as LLM-ready dicts."""
    records = await pocketbase_service.get_messages(session_id)
    recent = records[-limit:] if len(records) > limit else records
    return [{"role": r["role"], "content": r["content"]} for r in recent]


@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
@limiter.limit("20/minute")
async def chat(request: Request, req: ChatRequest) -> ChatResponse:
    await pocketbase_service.ensure_session(
        req.session_id, title=req.title or req.message[:60], incognito=req.incognito
    )
    history = await _load_history(req.session_id)
    await pocketbase_service.save_message(session_id=req.session_id, role="user", content=req.message)

    # Judge + embed run in parallel — no latency penalty on the happy path
    (verdict, judge_reply, judge_cost, judge_tok_in, judge_tok_out), query_vector = await asyncio.gather(
        judge_message(req.message),
        embed_service.embed(req.message),
    )

    if verdict != "pass":
        await pocketbase_service.save_message(
            session_id=req.session_id, role="assistant", content=judge_reply,
            model_used=_JUDGE_MODEL, cost_usd=judge_cost,
            tokens_in=judge_tok_in, tokens_out=judge_tok_out,
        )
        return ChatResponse(
            response=judge_reply, session_id=req.session_id,
            model_used=_JUDGE_MODEL, cost_usd=judge_cost, sources=[],
        )

    chunks = await qdrant_service.search(query_vector, limit=5)
    context_block = "\n\n".join(f"[{i+1}] {c}" for i, c in enumerate(chunks) if c)

    messages = _build_messages(req.message, context_block, history)
    model = _route_model(req.message, req.model)
    chain = _get_fallback_chain(model)

    llm_resp = None
    for attempt in chain:
        model = attempt
        try:
            llm_resp = await litellm_service.chat(messages=messages, model=model)
            break
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 429 and attempt != chain[-1]:
                continue
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
        req.session_id, title=req.title or req.message[:60], incognito=req.incognito
    )
    history = await _load_history(req.session_id)
    await pocketbase_service.save_message(session_id=req.session_id, role="user", content=req.message)

    # Judge + embed run in parallel — no latency penalty on the happy path
    (verdict, judge_reply, judge_cost, judge_tok_in, judge_tok_out), query_vector = await asyncio.gather(
        judge_message(req.message),
        embed_service.embed(req.message),
    )

    if verdict != "pass":
        async def canned_stream():
            yield f"data: {json.dumps({'token': judge_reply})}\n\n"
            await pocketbase_service.save_message(
                session_id=req.session_id, role="assistant", content=judge_reply,
                model_used=_JUDGE_MODEL, cost_usd=judge_cost,
                tokens_in=judge_tok_in, tokens_out=judge_tok_out,
            )
            yield f"data: {json.dumps({'done': True, 'session_id': req.session_id, 'model_used': _JUDGE_MODEL, 'cost_usd': judge_cost, 'tokens_in': judge_tok_in, 'tokens_out': judge_tok_out})}\n\n"

        return StreamingResponse(canned_stream(), media_type="text/event-stream", headers=_SSE_HEADERS)

    chunks = await qdrant_service.search(query_vector, limit=5)
    context_block = "\n\n".join(f"[{i+1}] {c}" for i, c in enumerate(chunks) if c)

    messages = _build_messages(req.message, context_block, history)
    model = _route_model(req.message, req.model)
    chain = _get_fallback_chain(model)
    input_text = " ".join(m.get("content", "") for m in messages)
    collected: list[str] = []

    async def event_stream():
        nonlocal model
        tokens_in: int = 0
        tokens_out: int = 0

        for i, attempt in enumerate(chain):
            model = attempt
            try:
                async for token, usage in litellm_service.stream(messages=messages, model=model):
                    if token:
                        collected.append(token)
                        yield f"data: {json.dumps({'token': token})}\n\n"
                    elif usage:
                        tokens_in = usage.get("prompt_tokens", 0)
                        tokens_out = usage.get("completion_tokens", 0)
                break
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code == 429 and i < len(chain) - 1:
                    collected.clear()
                    tokens_in = tokens_out = 0
                    next_model = chain[i + 1]
                    yield f"data: {json.dumps({'notice': 'rate_limit_fallback', 'model': next_model})}\n\n"
                    continue
                yield f"data: {json.dumps({'error': str(exc)})}\n\n"
                return
            except Exception as exc:
                yield f"data: {json.dumps({'error': str(exc)})}\n\n"
                return

        full_content = "".join(collected)
        if tokens_in == 0 and tokens_out == 0:
            cost_usd = estimate_cost(model, input_text, full_content)
            tokens_in = max(1, len(input_text) // 4)
            tokens_out = max(1, len(full_content) // 4)
        else:
            cost_usd = _compute_cost(model, tokens_in, tokens_out)

        await pocketbase_service.save_message(
            session_id=req.session_id,
            role="assistant",
            content=full_content,
            model_used=model,
            cost_usd=cost_usd,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
        )
        yield f"data: {json.dumps({'done': True, 'session_id': req.session_id, 'model_used': model, 'cost_usd': cost_usd, 'tokens_in': tokens_in, 'tokens_out': tokens_out})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=_SSE_HEADERS)
