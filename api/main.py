from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import chat, health, ingest
from services.qdrant_service import qdrant_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    await qdrant_service.ensure_collection()
    yield


app = FastAPI(
    title="SelfGPT API",
    description="Digital twin of Prasanna Rajendran",
    version="1.0.0",
    lifespan=lifespan,
)

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
