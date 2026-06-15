import logging
from collections.abc import AsyncIterator

import httpx
import msgpack
from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse

log = logging.getLogger(__name__)

from config import settings
from limiter import limiter
from models.audio import SynthesizeRequest, TranscribeResponse

router = APIRouter()

_GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
_FISH_TTS_URL = "https://api.fish.audio/v1/tts"
_STT_MODEL = "whisper-large-v3-turbo"


@router.post("/transcribe", response_model=TranscribeResponse)
@limiter.limit("30/minute")
async def transcribe(request: Request, file: UploadFile = File(...)) -> TranscribeResponse:
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="STT not configured: GROQ_API_KEY missing",
        )

    audio_bytes = await file.read()
    filename = file.filename or "recording.webm"
    content_type = file.content_type or "audio/webm"

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                _GROQ_STT_URL,
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                files={"file": (filename, audio_bytes, content_type)},
                data={"model": _STT_MODEL, "response_format": "json"},
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Groq STT error {exc.response.status_code}: {exc.response.text[:200]}",
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Groq STT request failed: {exc}",
            )

    return TranscribeResponse(transcript=resp.json().get("text", ""))


async def _fish_audio_stream(text: str) -> AsyncIterator[bytes]:
    payload = msgpack.packb({
        "text": text,
        "reference_id": settings.fish_audio_voice_id,
        "model": "s2-pro",
        "format": "wav",
        "streaming": True,
        "latency": "balanced",
        "normalize": True,
    })
    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST",
            _FISH_TTS_URL,
            content=payload,
            headers={
                "Authorization": f"Bearer {settings.fish_audio_api_key}",
                "Content-Type": "application/msgpack",
            },
            timeout=60.0,
        ) as resp:
            if resp.status_code != 200:
                await resp.aread()
                resp.raise_for_status()
            async for chunk in resp.aiter_bytes(chunk_size=4096):
                yield chunk


async def _synthesize_kokoro(client: httpx.AsyncClient, text: str) -> bytes:
    resp = await client.post(
        f"{settings.kokoro_url}/v1/audio/speech",
        json={
            "model": "kokoro",
            "input": text,
            "voice": settings.tts_voice,
            "response_format": "wav",
            "speed": 1.0,
        },
        timeout=60.0,
    )
    resp.raise_for_status()
    return resp.content


@router.post("/synthesize")
@limiter.limit("60/minute")
async def synthesize(request: Request, req: SynthesizeRequest) -> StreamingResponse:
    use_fish = (
        settings.tts_provider == "fish"
        and bool(settings.fish_audio_api_key)
        and bool(settings.fish_audio_voice_id)
    )

    if use_fish:
        gen = _fish_audio_stream(req.text)
        try:
            first_chunk = await gen.__anext__()
        except StopAsyncIteration:
            first_chunk = b""
        except Exception as exc:
            log.warning("Fish Audio failed (%s), falling back to Kokoro", exc)
            await gen.aclose()
            async with httpx.AsyncClient() as client:
                try:
                    audio_bytes = await _synthesize_kokoro(client, req.text)
                except httpx.HTTPStatusError as e:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"TTS error {e.response.status_code}",
                    )
                except httpx.RequestError as e:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"TTS request failed: {e}",
                    )
            log.info("TTS synthesized %d bytes via kokoro-fallback", len(audio_bytes))
            return StreamingResponse(
                content=iter([audio_bytes]),
                media_type="audio/wav",
                headers={
                    "Content-Length": str(len(audio_bytes)),
                    "Cache-Control": "no-cache",
                    "X-TTS-Provider": "kokoro-fallback",
                },
            )

        async def _piped() -> AsyncIterator[bytes]:
            if first_chunk:
                yield first_chunk
            async for chunk in gen:
                yield chunk

        log.info("TTS streaming via fish (balanced latency)")
        return StreamingResponse(
            content=_piped(),
            media_type="audio/wav",
            headers={
                "Cache-Control": "no-cache",
                "X-TTS-Provider": "fish",
            },
        )

    if not settings.kokoro_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TTS not configured: neither Fish Audio nor Kokoro is configured",
        )
    async with httpx.AsyncClient() as client:
        try:
            audio_bytes = await _synthesize_kokoro(client, req.text)
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"TTS error {exc.response.status_code}",
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"TTS request failed: {exc}",
            )
    log.info("TTS synthesized %d bytes via kokoro", len(audio_bytes))
    return StreamingResponse(
        content=iter([audio_bytes]),
        media_type="audio/wav",
        headers={
            "Content-Length": str(len(audio_bytes)),
            "Cache-Control": "no-cache",
            "X-TTS-Provider": "kokoro",
        },
    )
