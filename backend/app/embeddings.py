"""OpenAI embeddings — the bridge between book text and the Qdrant vector store."""
from __future__ import annotations

from openai import AsyncOpenAI

from .config import settings

_client: AsyncOpenAI | None = None


def get_openai() -> AsyncOpenAI:
    """Shared async OpenAI client (used by embeddings, personalize, translate)."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of strings with the configured embedding model."""
    if not texts:
        return []
    resp = await get_openai().embeddings.create(
        model=settings.openai_embedding_model,
        input=texts,
    )
    # The API preserves input order.
    return [d.embedding for d in resp.data]


async def embed_query(text: str) -> list[float]:
    out = await embed_texts([text])
    return out[0]
