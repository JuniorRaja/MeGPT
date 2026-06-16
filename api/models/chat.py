from typing import Literal, Optional

from pydantic import BaseModel, Field

ChatMode = Literal["natural", "professional", "chill", "flirty"]


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: str = Field(..., min_length=1)
    model: Optional[str] = None
    title: Optional[str] = None
    incognito: bool = False
    voice_mode: bool = False
    mode: ChatMode = "natural"


class ChatResponse(BaseModel):
    response: str
    session_id: str
    model_used: str
    cost_usd: float
    sources: list[str]
