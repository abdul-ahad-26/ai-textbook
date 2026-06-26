"""FastAPI backend for the AI-native textbook.

Endpoints:
  POST /chatkit       -> ChatKit protocol endpoint (RAG agent, selected-text aware)
  POST /personalize   -> rewrite a chapter for the reader's background
  POST /translate     -> translate a chapter to Urdu
  GET  /health        -> liveness + config sanity
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from chatkit.server import StreamingResult

from .config import settings
from .agent import RequestContext
from .auth import resolve_identity
from .chatkit_server import BookChatKitServer
from .stores import NeonStore, MemoryStore
from .transform import personalize_chapter, translate_to_urdu
from . import db, rate_limit

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
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def rate_limited(limit: int, window: float = 60.0):
    """Per-IP rate-limit dependency for the paid, OpenAI-backed endpoints.

    Implemented as a dependency (not BaseHTTPMiddleware) so it never wraps the
    response — important because /chatkit streams SSE, which BaseHTTPMiddleware
    can buffer and break. A raised HTTPException still flows back through the CORS
    middleware, so the 429 keeps its CORS headers.
    """

    async def _dep(request: Request) -> None:
        fwd = request.headers.get("x-forwarded-for", "")
        ip = fwd.split(",")[0].strip() or (request.client.host if request.client else "unknown")
        if not rate_limit.allow(f"{ip}:{request.url.path}", limit, window):
            raise HTTPException(status_code=429, detail="rate limit exceeded")

    return _dep


async def _request_context(request: Request) -> RequestContext:
    """Build per-request context. Identity is VERIFIED from the bearer session
    token (see auth.resolve_identity); the X-User-* headers are no longer trusted."""
    user_id, profile = await resolve_identity(request)
    selected = request.headers.get("X-Selected-Text") or None
    site_base = request.headers.get("X-Site-Base") or ""
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


@app.post("/chatkit", dependencies=[Depends(rate_limited(40))])
async def chatkit_endpoint(request: Request):
    """ChatKit protocol endpoint. The widget posts here; we stream agent events back."""
    assert chatkit_server is not None
    context = await _request_context(request)
    body = await request.body()
    await db.log_request("chat", context.user_id, {"selected": bool(context.selected_text)})
    result = await chatkit_server.process(body, context)
    if isinstance(result, StreamingResult):
        return StreamingResponse(result, media_type="text/event-stream")
    # NonStreamingResult carries a JSON string payload.
    return Response(content=result.json, media_type="application/json")


class TransformRequest(BaseModel):
    content: str
    chapter_id: str | None = None


@app.post("/personalize", dependencies=[Depends(rate_limited(15))])
async def personalize_endpoint(req: TransformRequest, request: Request):
    """Rewrite a chapter's markdown for the reader's software/hardware background.

    Logged-in only — the profile is read from the verified session, not the body.
    """
    user_id, profile = await resolve_identity(request)
    if not user_id:
        return JSONResponse({"error": "authentication required"}, status_code=401)
    await db.log_request("personalize", user_id, {"chapter": req.chapter_id})
    markdown = await personalize_chapter(req.content, profile)
    return JSONResponse({"markdown": markdown})


@app.post("/translate", dependencies=[Depends(rate_limited(15))])
async def translate_endpoint(req: TransformRequest, request: Request):
    """Translate a chapter's markdown to Urdu. Logged-in only (per the brief)."""
    user_id, _ = await resolve_identity(request)
    if not user_id:
        return JSONResponse({"error": "authentication required"}, status_code=401)
    await db.log_request("translate", user_id, {"chapter": req.chapter_id})
    markdown = await translate_to_urdu(req.content)
    return JSONResponse({"markdown": markdown, "lang": "ur"})
