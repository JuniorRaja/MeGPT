from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    text: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1, description="e.g. 'bio', 'github', 'notion'")
    category: str = Field(..., min_length=1, description="e.g. 'about', 'projects', 'skills'")


class IngestResponse(BaseModel):
    chunks_created: int
    source: str
    category: str
