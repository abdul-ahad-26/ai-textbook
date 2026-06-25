"""Qdrant Cloud vector store — stores and retrieves book chunks for RAG."""
from __future__ import annotations

from dataclasses import dataclass

from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qmodels

from .config import settings
from .embeddings import embed_query

_client: AsyncQdrantClient | None = None


def get_qdrant() -> AsyncQdrantClient:
    global _client
    if _client is None:
        _client = AsyncQdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)
    return _client


@dataclass
class RetrievedChunk:
    text: str
    title: str
    url: str
    module: str
    score: float

    def as_citation(self) -> str:
        return f"[{self.title}]({self.url})"


async def ensure_collection() -> None:
    """Create the collection if it does not exist (idempotent — safe to call on ingest)."""
    client = get_qdrant()
    existing = {c.name for c in (await client.get_collections()).collections}
    if settings.qdrant_collection not in existing:
        await client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=qmodels.VectorParams(
                size=settings.embedding_dim,
                distance=qmodels.Distance.COSINE,
            ),
        )


async def search(query: str, limit: int = 6) -> list[RetrievedChunk]:
    """Embed the query and return the most relevant book chunks."""
    if not settings.has_qdrant:
        return []
    vector = await embed_query(query)
    # query_points is the current API (the older .search() was removed in qdrant-client).
    response = await get_qdrant().query_points(
        collection_name=settings.qdrant_collection,
        query=vector,
        limit=limit,
        with_payload=True,
    )
    chunks: list[RetrievedChunk] = []
    for h in response.points:
        p = h.payload or {}
        chunks.append(
            RetrievedChunk(
                text=p.get("text", ""),
                title=p.get("title", "Untitled"),
                url=p.get("url", ""),
                module=p.get("module", ""),
                score=float(h.score),
            )
        )
    return chunks


def _absolute(url: str, site_base: str) -> str:
    """Turn a stored route into a full, clickable URL.

    Chunks are ingested with site-relative routes (e.g. /module-1-ros2/overview).
    Links inside the ChatKit widget live in a cross-origin iframe, so they must be
    absolute to be clickable. We prefix the per-request site base when the stored
    url is relative, and leave already-absolute urls untouched.
    """
    if not url:
        return site_base or ""
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if not site_base:
        return url
    return site_base.rstrip("/") + "/" + url.lstrip("/")


def format_context(chunks: list[RetrievedChunk], site_base: str = "") -> str:
    """Render retrieved chunks into a grounded context block for the agent."""
    if not chunks:
        return "No relevant passages were found in the book."
    blocks = []
    for i, c in enumerate(chunks, 1):
        blocks.append(f"[{i}] Source: {c.title} ({_absolute(c.url, site_base)})\n{c.text}")
    return "\n\n".join(blocks)
