# Physical AI & Humanoid Robotics — An AI-Native Textbook

A complete, AI-native technical textbook for the **Physical AI & Humanoid Robotics**
course, built for the Panaversity hackathon. The book teaches embodied intelligence
with **ROS 2, Gazebo/Unity, NVIDIA Isaac, and Vision-Language-Action models** — and
it teaches *interactively*: a built-in RAG assistant answers questions about the
content, readers can personalize each chapter to their background, and translate any
chapter to Urdu.

> **Live stack (exactly as the hackathon mandates):** Docusaurus → GitHub Pages ·
> OpenAI **Agents SDK + ChatKit** · **FastAPI** · **Neon** Serverless Postgres ·
> **Qdrant** Cloud · **Better-Auth**.

---

## What's inside

```
ai-textbook/
├── book/        Docusaurus site — the textbook + React widgets (→ GitHub Pages)
├── backend/     FastAPI — ChatKit RAG agent, /personalize, /translate (→ HF Spaces)
├── auth/        Better-Auth Node server — signup w/ SW/HW background (→ any Node host)
├── .claude/     Subagents + Agent Skills (reusable intelligence)
└── .github/     GitHub Actions → build & deploy the book to Pages
```

## How each requirement is met

| # | Requirement | Where |
|---|-------------|-------|
| 1 | Book in **Docusaurus**, deploy to **GitHub Pages** | `book/`, `.github/workflows/deploy.yml` |
| 2 | **RAG chatbot**: OpenAI Agents/ChatKit + FastAPI + Neon + Qdrant; answers from book **and selected text** | `backend/app/chatkit_server.py`, `agent.py`, `qdrant_store.py`, `book/src/components/ChatWidget` |
| Bonus | **Subagents + Agent Skills** | `.claude/agents/*`, `.claude/skills/*` |
| Bonus | **Better-Auth** signup/signin asking SW/HW background | `auth/`, `book/src/components/Auth` |
| Bonus | **Personalize** chapter button | `book/src/components/ChapterToolbar`, `backend` `/personalize` |
| Bonus | **Translate to Urdu** chapter button | `book/src/components/ChapterToolbar`, `backend` `/translate` |

### The selected-text feature
Highlight any text in the book → the ChatKit widget sends it in an `X-Selected-Text`
header → the agent is instructed to answer **based on that selection**. The floating
launcher shows an amber dot when a selection is active.

---

## Quick start (local)

You need: **Node ≥ 20**, **Python 3.12**, and accounts for **OpenAI**, **Qdrant
Cloud (free)**, and **Neon (free)**.

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate     # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # fill OPENAI_API_KEY, QDRANT_*, DATABASE_URL
python -m scripts.ingest        # index the book into Qdrant
uvicorn app.main:app --reload --port 8000
```

### 2. Auth (Better-Auth)
```bash
cd auth
npm install
cp .env.example .env            # fill DATABASE_URL, BETTER_AUTH_SECRET
npm run migrate                 # create auth tables in Neon
npm run dev                     # http://localhost:3001
```

### 3. Book (Docusaurus)
```bash
cd book
npm install
npm start                       # http://localhost:3000
```
Defaults already point the book at `localhost:8000` (backend) and `localhost:3001`
(auth), with ChatKit `domainKey: local-dev`.

---

## Deploy

- **Book → GitHub Pages:** push to `main`; the workflow builds `book/` and deploys.
  Set repo **Variables** `BACKEND_URL`, `AUTH_URL`, `CHATKIT_DOMAIN_KEY`. Enable
  Pages (Source: GitHub Actions).
- **Backend → Hugging Face Spaces (Docker):** push `backend/` to a Docker Space; add
  the `.env` values as Space secrets. See `backend/README.md`.
- **Auth → any Node host:** Render/Railway/Fly. Set `BOOK_ORIGIN` +
  `EXTRA_TRUSTED_ORIGINS` to the deployed book origin. See `auth/README.md`.
- **ChatKit:** add `localhost` (dev) and your `*.github.io` domain to the OpenAI
  **domain allowlist**; use `domainKey: local-dev` locally and the real key in prod.

Run the **`release-check`** Agent Skill before shipping.

---

## Reusable intelligence (`.claude/`)

**Subagents** — `chapter-author` (writes chapters in house style), `rag-curator`
(re-indexes Qdrant, debugs retrieval), `robotics-fact-checker` (verifies ROS 2 /
Isaac / VLA accuracy).

**Agent Skills** — `new-chapter` (scaffold a chapter + sidebar + reindex),
`release-check` (pre-deploy checklist).

These were used to build and maintain the book itself.

---

## Tech notes
- Built with **Claude Code**. Spec-Kit Plus intentionally omitted.
- Default models: `gpt-4.1` (agent/transforms), `text-embedding-3-small` (retrieval).
- If `DATABASE_URL` is unset, the backend uses an in-memory thread store so it still
  runs for a smoke test — set Neon for the real deliverable.
