from typing import Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: str = Field(..., min_length=1)
    model: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str
    model_used: str
    cost_usd: float
    sources: list[str]
