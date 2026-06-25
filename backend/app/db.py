"""Neon Serverless Postgres access via an asyncpg pool.

Stores ChatKit threads + items (so conversations persist across sessions) and a
lightweight analytics log. User accounts/profiles live in the Better-Auth
database; the backend receives the profile per-request via a header.
"""
from __future__ import annotations

import asyncpg

from .config import settings

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        if not settings.has_neon:
            raise RuntimeError("DATABASE_URL (Neon) is not configured")
        _pool = await asyncpg.create_pool(dsn=settings.database_url, min_size=1, max_size=5)
    return _pool


SCHEMA = """
CREATE TABLE IF NOT EXISTS chatkit_threads (
    id          TEXT PRIMARY KEY,
    user_id     TEXT,
    payload     JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chatkit_items (
    thread_id   TEXT NOT NULL,
    item_id     TEXT NOT NULL,
    seq         BIGSERIAL,
    payload     JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (thread_id, item_id)
);
CREATE INDEX IF NOT EXISTS chatkit_items_thread_seq ON chatkit_items (thread_id, seq);

CREATE TABLE IF NOT EXISTS chatkit_attachments (
    id          TEXT PRIMARY KEY,
    payload     JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS request_log (
    id          BIGSERIAL PRIMARY KEY,
    user_id     TEXT,
    kind        TEXT NOT NULL,          -- 'chat' | 'personalize' | 'translate'
    meta        JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


async def init_db() -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(SCHEMA)


async def log_request(kind: str, user_id: str | None, meta: dict | None = None) -> None:
    if not settings.has_neon:
        return
    import json

    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO request_log (user_id, kind, meta) VALUES ($1, $2, $3)",
            user_id,
            kind,
            json.dumps(meta or {}),
        )


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
