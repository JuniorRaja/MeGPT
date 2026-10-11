FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local

# fastembed defaults to /tmp/fastembed_cache; keep the model in a fixed path instead.
ENV FASTEMBED_CACHE_PATH=/opt/fastembed_cache
ARG EMBED_MODEL=nomic-ai/nomic-embed-text-v1.5-Q
ENV EMBED_MODEL=$EMBED_MODEL

# Pre-download the embedding model so the first request has no cold-start delay.
RUN python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='${EMBED_MODEL}')" \
    && find /usr/local -name "__pycache__" -type d -prune -exec rm -rf {} + \
    && rm -rf /root/.cache

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
