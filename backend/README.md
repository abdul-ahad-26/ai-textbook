---
title: Physical AI Textbook API
emoji: 🤖
colorFrom: green
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
---

# Physical AI Textbook — Backend (FastAPI)

RAG + transforms backend for the AI-native textbook. Implements the hackathon's
mandated stack:

- **OpenAI Agents SDK + ChatKit** — the self-hosted chat agent (`/chatkit`)
- **Qdrant Cloud** — vector store for retrieval
- **Neon Serverless Postgres** — thread/item persistence + request log
- **FastAPI** — HTTP surface

> The YAML header above is the Hugging Face Spaces config — push this folder to a
> **Docker** Space and it boots automatically on port 7860.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/chatkit` | ChatKit protocol endpoint (RAG agent, selected-text aware) |
| `POST` | `/personalize` | Rewrite a chapter for the reader's background |
| `POST` | `/translate` | Translate a chapter to Urdu |
| `GET`  | `/health` | Liveness + config sanity |

## Run locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # then fill in your keys
uvicorn app.main:app --reload --port 8000
```

Check it: `curl http://localhost:8000/health`

## Ingest the book into Qdrant

Run once (and after editing chapters) to index the book for retrieval:

```bash
python -m scripts.ingest
# optionally make citations absolute:
python -m scripts.ingest --site-url https://YOURNAME.github.io/ai-textbook
```

## Deploy to Hugging Face Spaces

1. Create a new **Space** → SDK: **Docker**.
2. Push the contents of this `backend/` folder to the Space repo.
3. In the Space **Settings → Variables and secrets**, add everything from `.env`
   (`OPENAI_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`, `DATABASE_URL`, …) and set
   `CORS_ORIGINS` to include your GitHub Pages origin.
4. The Space builds the Dockerfile and serves on `https://<user>-<space>.hf.space`.
5. Point the book's `BACKEND_URL` at that URL.

## Notes

- If `DATABASE_URL` is unset, the server uses an in-memory thread store so it still
  runs for a quick smoke test — but set Neon for the real deliverable.
- Selected-text scoping: the ChatKit widget sends the highlighted text in the
  `X-Selected-Text` header; the agent is instructed to answer from it.
- The reader's background arrives in `X-User-Profile` (chat) or the JSON body
  (`/personalize`).
