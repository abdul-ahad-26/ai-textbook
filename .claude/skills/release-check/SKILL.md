---
name: release-check
description: Pre-deploy checklist for the AI-native textbook — verifies the book builds, the backend/auth config is sound, and the RAG index is fresh before publishing to GitHub Pages + Hugging Face. Use before any deploy or demo.
---

# Release Check

Run this before deploying or demoing the textbook. Report a pass/fail table; stop and
flag the first hard failure.

## 1. Book builds cleanly
```bash
cd book && npm ci && npm run build
```
- Fails on broken links / bad front-matter. Fix before shipping.
- Confirm `docusaurus.config.ts` `url`, `baseUrl`, `GH_ORG`, `GH_REPO` are correct
  for the target GitHub Pages location.

## 2. Backend config is complete
- `backend/.env` (or host secrets) has: `OPENAI_API_KEY`, `QDRANT_URL`,
  `QDRANT_API_KEY`, `DATABASE_URL`, and `CORS_ORIGINS` including the **deployed book
  origin** (e.g. `https://<user>.github.io`).
- `GET /health` returns `openai:true, qdrant:true, neon:true`.

## 3. RAG index is fresh
```bash
cd backend && python -m scripts.ingest
```
- Re-run if any chapter changed since the last ingest. Confirm chunk count > 0.

## 4. Auth server reachable
- `GET <AUTH_URL>/health` returns ok.
- `EXTRA_TRUSTED_ORIGINS` / `BOOK_ORIGIN` include the deployed book origin.
- Cookies are `SameSite=None; Secure` for cross-origin prod (already set in `auth/src/auth.ts`).

## 5. ChatKit wiring
- `BACKEND_URL` build env points at the deployed backend (HF Space URL), **not**
  localhost.
- `CHATKIT_DOMAIN_KEY` is the real domain key in prod (`local-dev` only for local).
- The deployed book domain is on the OpenAI **domain allowlist**.

## 6. Frontend env for deploy
The GitHub Pages build must be run with: `GH_ORG`, `GH_REPO`, `DEPLOY_URL`,
`BASE_URL`, `BACKEND_URL`, `AUTH_URL`, `CHATKIT_DOMAIN_KEY` set (see
`.github/workflows/deploy.yml`).

Output a final table: each step → PASS / FAIL / SKIPPED, with the blocking item first.
