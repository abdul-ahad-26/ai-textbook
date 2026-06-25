"""FastAPI backend for the AI-native textbook.

Endpoints:
  POST /chatkit       -> ChatKit protocol endpoint (RAG agent, selected-text aware)
  POST /personalize   -> rewrite a chapter for the reader's background
  POST /translate     -> translate a chapter to Urdu
  GET  /health        -> liveness + config sanity
"""
from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from chatkit.server import StreamingResult

from .config import settings
from .agent import RequestContext
from .chatkit_server import BookChatKitServer
from .stores import NeonStore, MemoryStore
from .transform import personalize_chapter, translate_to_urdu
from . import db

log = logging.getLogger("textbook")
logging.basicConfig(level=logging.INFO)

chatkit_server: BookChatKitServer | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global chatkit_server
    # Choose persistence: Neon if configured, else the in-memory fallback.
    if settings.has_neon:
        try:
            await db.init_db()
            store = NeonStore()
            log.info("Using Neon Postgres store")
        except Exception as e:  # pragma: no cover
            log.warning("Neon unavailable (%s); falling back to memory store", e)
            store = MemoryStore()
    else:
        store = MemoryStore()
        log.info("DATABASE_URL not set — using in-memory store")
    chatkit_server = BookChatKitServer(store)
    yield
    await db.close_pool()


app = FastAPI(title="Physical AI Textbook API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    # Allow the deployed Pages site plus dev tunnels / codespaces used to satisfy
    # ChatKit's domain verification (which rejects bare localhost).
    allow_origin_regex=r"https://.*\.(github\.io|trycloudflare\.com|app\.github\.dev|hf\.space|ngrok-free\.app)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _request_context(request: Request) -> RequestContext:
    """Build per-request context from headers set by the ChatKit fetch override."""
    user_id = request.headers.get("X-User-Id") or None
    selected = request.headers.get("X-Selected-Text") or None
    site_base = request.headers.get("X-Site-Base") or ""
    profile: dict = {}
    raw_profile = request.headers.get("X-User-Profile")
    if raw_profile:
        try:
            profile = json.loads(raw_profile)
        except json.JSONDecodeError:
            profile = {}
    return RequestContext(
        user_id=user_id, profile=profile, selected_text=selected, site_base=site_base
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "openai": bool(settings.openai_api_key),
        "qdrant": settings.has_qdrant,
        "neon": settings.has_neon,
        "model": settings.openai_model,
    }


@app.post("/chatkit")
async def chatkit_endpoint(request: Request):
    """ChatKit protocol endpoint. The widget posts here; we stream agent events back."""
    assert chatkit_server is not None
    context = _request_context(request)
    body = await request.body()
    await db.log_request("chat", context.user_id, {"selected": bool(context.selected_text)})
    result = await chatkit_server.process(body, context)
    if isinstance(result, StreamingResult):
        return StreamingResponse(result, media_type="text/event-stream")
    # NonStreamingResult carries a JSON string payload.
    return Response(content=result.json, media_type="application/json")


class TransformRequest(BaseModel):
    content: str
    user_id: str | None = None
    profile: dict | None = None
    chapter_id: str | None = None


@app.post("/personalize")
async def personalize_endpoint(req: TransformRequest):
    """Rewrite a chapter's markdown for the reader's software/hardware background."""
    profile = req.profile or {}
    await db.log_request("personalize", req.user_id, {"chapter": req.chapter_id})
    markdown = await personalize_chapter(req.content, profile)
    return JSONResponse({"markdown": markdown})


@app.post("/translate")
async def translate_endpoint(req: TransformRequest):
    """Translate a chapter's markdown to Urdu."""
    await db.log_request("translate", req.user_id, {"chapter": req.chapter_id})
    markdown = await translate_to_urdu(req.content)
    return JSONResponse({"markdown": markdown, "lang": "ur"})
