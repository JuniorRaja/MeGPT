import httpx
from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse

from config import settings
from limiter import limiter
from models.audio import SynthesizeRequest, TranscribeResponse

router = APIRouter()

_GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
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


@router.post("/synthesize")
@limiter.limit("60/minute")
async def synthesize(request: Request, req: SynthesizeRequest) -> StreamingResponse:
    if not settings.kokoro_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TTS not configured: KOKORO_URL missing",
        )

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(
                f"{settings.kokoro_url}/v1/audio/speech",
                json={
                    "model": "kokoro",
                    "input": req.text,
                    "voice": settings.tts_voice,
                    "response_format": "wav",
                    "speed": 1.0,
                },
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Kokoro TTS error {exc.response.status_code}",
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Kokoro TTS request failed: {exc}",
            )

    audio_bytes = resp.content
    return StreamingResponse(
        content=iter([audio_bytes]),
        media_type="audio/wav",
        headers={
            "Content-Length": str(len(audio_bytes)),
            "Cache-Control": "no-cache",
        },
    )
