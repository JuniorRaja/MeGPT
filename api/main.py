from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config import settings
from limiter import limiter
from routers import chat, feedback, health, ingest, sessions
from services.pocketbase_service import pocketbase_service
from services.qdrant_service import qdrant_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    await qdrant_service.ensure_collection()
    await pocketbase_service.ensure_schema_fields()
    yield


app = FastAPI(
    title="SelfGPT API",
    description="Digital twin of Prasanna Rajendran",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(ingest.router, prefix="/ingest", tags=["ingest"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(feedback.router, prefix="/feedback", tags=["feedback"])
