from pydantic import BaseModel, Field


class TranscribeResponse(BaseModel):
    transcript: str


class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
