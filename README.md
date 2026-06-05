# SelfGPT — Digital Twin of Prasanna Rajendran

A production-grade personal AI twin that answers questions about Prasanna Rajendran (PR) — his work, skills, projects, opinions, travel, and interests. Powered by RAG over a personal knowledge base with a Claude-style UI.

---

## What is this?

SelfGPT is a RAG-based chatbot that:
- Embeds and stores PR's personal knowledge (bios, projects, writing, talks) in Qdrant
- Retrieves relevant context for each query and feeds it to an LLM via LiteLLM
- Maintains conversation sessions in PocketBase
- Traces every request in Langfuse for observability
- Serves a polished Next.js UI with 3 visual themes (Claude, GPT, Grok)

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 14 App Router + Tailwind    |
| Backend     | FastAPI (Python 3.11)               |
| Vector DB   | Qdrant                              |
| LLM Proxy   | LiteLLM                             |
| Tracing     | Langfuse                            |
| Storage     | PocketBase                          |
| Embeddings  | nomic-embed-text via Ollama         |
| Infra       | Docker Compose                      |

---

## Local Setup

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.11+
- [Ollama](https://ollama.ai) with `nomic-embed-text` pulled: `ollama pull nomic-embed-text`

### 1. Clone and configure

```bash
git clone https://github.com/prasannarajendran/selfgpt
cd selfgpt
cp .env.example .env
# Edit .env — fill in GROQ_API_KEY at minimum
```

### 2. Start infrastructure

```bash
docker compose up -d qdrant litellm langfuse_db langfuse
```

### 3. Start PocketBase (separate binary)

Download from https://pocketbase.io/docs/ and run:
```bash
./pocketbase serve --http=0.0.0.0:8090
```
Create an admin account, then create collections: `sessions`, `messages`.

### 4. Start the API

```bash
cd api
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 5. Start the UI

```bash
cd ui
cp .env.local.example .env.local
npm install
npm run dev
```

Visit http://localhost:3000

### 6. Ingest your knowledge

```bash
curl -X POST http://localhost:8000/ingest \
  -H "Content-Type: application/json" \
  -d '{"text": "Prasanna Rajendran is a full-stack engineer and product builder...", "source": "bio", "category": "about"}'
```

---

## Environment Variables

| Variable                 | Description                              |
|--------------------------|------------------------------------------|
| `GROQ_API_KEY`           | Groq API key (primary LLM)               |
| `OPENAI_API_KEY`         | OpenAI key (deep/gpt-4o model)           |
| `ANTHROPIC_API_KEY`      | Anthropic key (smart/claude model)       |
| `LITELLM_MASTER_KEY`     | LiteLLM proxy auth key                   |
| `LANGFUSE_PUBLIC_KEY`    | Langfuse project public key              |
| `LANGFUSE_SECRET_KEY`    | Langfuse project secret key              |
| `POCKETBASE_URL`         | PocketBase server URL                    |
| `POCKETBASE_ADMIN_EMAIL` | PocketBase admin email                   |
| `POCKETBASE_ADMIN_PASSWORD` | PocketBase admin password             |
| `QDRANT_URL`             | Qdrant server URL                        |
| `OLLAMA_URL`             | Ollama server URL (for embeddings)       |
| `DEFAULT_MODEL`          | Default LLM alias: groq / smart / deep   |
| `NEXT_PUBLIC_API_URL`    | FastAPI URL visible from the browser     |

---

## 8-Week Roadmap

### Week 1 — Foundation
- [x] Project scaffold: FastAPI + Next.js + Docker Compose
- [ ] Qdrant collection setup and ingest pipeline
- [ ] PocketBase schema: sessions, messages, feedback

### Week 2 — Knowledge Base
- [ ] Ingest PR's bio, resume, project descriptions, blog posts
- [ ] Tune chunking strategy (size, overlap, metadata)
- [ ] Test retrieval quality with 20 benchmark queries

### Week 3 — Chat Quality
- [ ] Multi-turn conversation with session memory
- [ ] System prompt iteration and persona tuning
- [ ] Model routing (fast for simple, deep for complex)

### Week 4 — UI Polish
- [ ] Streaming responses (SSE)
- [ ] Sidebar: real chat history from PocketBase
- [ ] Mobile-responsive layout
- [ ] Keyboard shortcuts (Enter to send, Shift+Enter newline)

### Week 5 — Observability
- [ ] Langfuse traces for every request
- [ ] Cost tracking per session
- [ ] Feedback loop: thumbs → PocketBase → Langfuse scores

### Week 6 — Deployment
- [ ] Dockerize API + UI
- [ ] Deploy to Railway or Fly.io
- [ ] Custom domain + HTTPS
- [ ] Rate limiting and basic auth for public access

### Week 7 — Enrichment
- [ ] Auto-ingest from Notion (PR's notes)
- [ ] Calendar availability endpoint ("Can I schedule a call?")
- [ ] GitHub activity ingestion (recent repos, READMEs)

### Week 8 — Launch
- [ ] Public launch page with embed widget
- [ ] Share link per conversation
- [ ] Analytics dashboard (queries/day, top topics, avg cost)
- [ ] README and documentation
