"""ChatKit Store implementations.

`NeonStore` persists ChatKit threads + items in Neon Postgres (JSONB).
`MemoryStore` is an in-process fallback for local smoke tests without a database.

ThreadMetadata / ThreadItem / Attachment are ChatKit pydantic models; we persist
them as JSON and rebuild them with pydantic TypeAdapters so we never have to track
the full union of item types by hand.
"""
from __future__ import annotations

import json
import uuid
from typing import Any

from pydantic import TypeAdapter

from chatkit.store import Store
from chatkit.types import ThreadMetadata, ThreadItem, Attachment

try:  # Page lives in chatkit.types in current releases; tolerate either location.
    from chatkit.types import Page
except ImportError:  # pragma: no cover
    from chatkit.store import Page  # type: ignore

from .db import get_pool

_THREAD_ADAPTER = TypeAdapter(ThreadMetadata)
_ITEM_ADAPTER = TypeAdapter(ThreadItem)
_ATTACH_ADAPTER = TypeAdapter(Attachment)


def _dump(model: Any) -> str:
    return json.dumps(model.model_dump(mode="json"))


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:24]}"


def _ctx_user_id(context: Any) -> str | None:
    """The verified user id for the current request, or None for anonymous."""
    return getattr(context, "user_id", None)


class NeonStore(Store):
    """Postgres-backed ChatKit store."""

    def generate_id(self, item_type: str, context: Any = None) -> str:  # noqa: D401
        # 'thread' -> thr_, 'message'/'item' -> itm_, 'attachment' -> att_
        prefix = {"thread": "thr", "attachment": "att"}.get(item_type, "itm")
        return _new_id(prefix)

    # ---- threads ----
    # Threads are scoped to their owner (context.user_id). `IS NOT DISTINCT FROM`
    # treats NULL = NULL, so an anonymous caller can only reach NULL-owned threads
    # and a signed-in caller only their own — preventing cross-user reads/deletes.
    async def load_thread(self, thread_id: str, context: Any) -> ThreadMetadata:
        user_id = _ctx_user_id(context)
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT payload FROM chatkit_threads WHERE id = $1 AND user_id IS NOT DISTINCT FROM $2",
                thread_id,
                user_id,
            )
        if row is None:
            raise KeyError(f"thread {thread_id} not found")
        return _THREAD_ADAPTER.validate_python(json.loads(row["payload"]))

    async def save_thread(self, thread: ThreadMetadata, context: Any) -> None:
        user_id = _ctx_user_id(context)
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO chatkit_threads (id, user_id, payload, updated_at)
                   VALUES ($1, $2, $3, now())
                   ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()""",
                thread.id,
                user_id,
                _dump(thread),
            )

    async def load_threads(self, limit: int, after: str | None, order: str, context: Any) -> Page:
        user_id = _ctx_user_id(context)
        # Anonymous callers get no history list — that removes the enumeration vector
        # while still letting an in-flight thread be loaded by its (unguessable) id.
        if user_id is None:
            return Page(data=[], has_more=False, after=None)
        direction = "DESC" if (order or "desc").lower() == "desc" else "ASC"
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                f"SELECT payload FROM chatkit_threads WHERE user_id = $1 ORDER BY updated_at {direction} LIMIT $2",
                user_id,
                limit + 1,
            )
        items = [_THREAD_ADAPTER.validate_python(json.loads(r["payload"])) for r in rows]
        has_more = len(items) > limit
        items = items[:limit]
        next_after = items[-1].id if items and has_more else None
        return Page(data=items, has_more=has_more, after=next_after)

    async def delete_thread(self, thread_id: str, context: Any) -> None:
        user_id = _ctx_user_id(context)
        pool = await get_pool()
        async with pool.acquire() as conn:
            # Only delete (and cascade items) if the thread belongs to this caller.
            owned = await conn.fetchval(
                "DELETE FROM chatkit_threads WHERE id = $1 AND user_id IS NOT DISTINCT FROM $2 RETURNING id",
                thread_id,
                user_id,
            )
            if owned:
                await conn.execute("DELETE FROM chatkit_items WHERE thread_id = $1", thread_id)

    # ---- items ----
    async def add_thread_item(self, thread_id: str, item: ThreadItem, context: Any) -> None:
        await self.save_item(thread_id, item, context)

    async def save_item(self, thread_id: str, item: ThreadItem, context: Any) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO chatkit_items (thread_id, item_id, payload)
                   VALUES ($1, $2, $3)
                   ON CONFLICT (thread_id, item_id) DO UPDATE SET payload = EXCLUDED.payload""",
                thread_id,
                item.id,
                _dump(item),
            )

    async def load_item(self, thread_id: str, item_id: str, context: Any) -> ThreadItem:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT payload FROM chatkit_items WHERE thread_id = $1 AND item_id = $2",
                thread_id,
                item_id,
            )
        if row is None:
            raise KeyError(f"item {item_id} not found")
        return _ITEM_ADAPTER.validate_python(json.loads(row["payload"]))

    async def load_thread_items(
        self, thread_id: str, after: str | None, limit: int, order: str, context: Any
    ) -> Page:
        # NOTE on the f-strings below: nothing user-controlled is interpolated. `direction`
        # and `cmp` come from a fixed whitelist; `${len(params)}` is a computed placeholder
        # INDEX, not a value. All actual values (thread_id, after_seq, limit) are bound via
        # asyncpg $N parameters, so this is not SQL-injectable.
        pool = await get_pool()
        direction = "DESC" if (order or "asc").lower() == "desc" else "ASC"
        async with pool.acquire() as conn:
            after_seq = None
            if after:
                after_seq = await conn.fetchval(
                    "SELECT seq FROM chatkit_items WHERE thread_id = $1 AND item_id = $2",
                    thread_id,
                    after,
                )
            cmp = "<" if direction == "DESC" else ">"
            params: list[Any] = [thread_id]
            seq_clause = ""
            if after_seq is not None:
                seq_clause = f"AND seq {cmp} $2"
                params.append(after_seq)
            params.append(limit + 1)
            rows = await conn.fetch(
                f"""SELECT payload, item_id FROM chatkit_items
                    WHERE thread_id = $1 {seq_clause}
                    ORDER BY seq {direction} LIMIT ${len(params)}""",
                *params,
            )
        items = [_ITEM_ADAPTER.validate_python(json.loads(r["payload"])) for r in rows]
        has_more = len(items) > limit
        items = items[:limit]
        next_after = items[-1].id if items and has_more else None
        return Page(data=items, has_more=has_more, after=next_after)

    async def delete_thread_item(self, thread_id: str, item_id: str, context: Any) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM chatkit_items WHERE thread_id = $1 AND item_id = $2", thread_id, item_id
            )

    # ---- attachments (book chat does not use uploads, but the interface requires these) ----
    async def save_attachment(self, attachment: Attachment, context: Any) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO chatkit_attachments (id, payload) VALUES ($1, $2)
                   ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload""",
                attachment.id,
                _dump(attachment),
            )

    async def load_attachment(self, attachment_id: str, context: Any) -> Attachment:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT payload FROM chatkit_attachments WHERE id = $1", attachment_id
            )
        if row is None:
            raise KeyError(f"attachment {attachment_id} not found")
        return _ATTACH_ADAPTER.validate_python(json.loads(row["payload"]))

    async def delete_attachment(self, attachment_id: str, context: Any) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute("DELETE FROM chatkit_attachments WHERE id = $1", attachment_id)


class MemoryStore(Store):
    """Volatile in-process store for local testing without Neon."""

    def __init__(self) -> None:
        self.threads: dict[str, ThreadMetadata] = {}
        self.items: dict[str, list[ThreadItem]] = {}
        self.attachments: dict[str, Attachment] = {}

    def generate_id(self, item_type: str, context: Any = None) -> str:
        prefix = {"thread": "thr", "attachment": "att"}.get(item_type, "itm")
        return _new_id(prefix)

    async def load_thread(self, thread_id: str, context: Any) -> ThreadMetadata:
        return self.threads[thread_id]

    async def save_thread(self, thread: ThreadMetadata, context: Any) -> None:
        self.threads[thread.id] = thread
        self.items.setdefault(thread.id, [])

    async def load_threads(self, limit: int, after: str | None, order: str, context: Any) -> Page:
        data = list(self.threads.values())
        if (order or "desc").lower() == "desc":
            data = data[::-1]
        return Page(data=data[:limit], has_more=len(data) > limit, after=None)

    async def delete_thread(self, thread_id: str, context: Any) -> None:
        self.threads.pop(thread_id, None)
        self.items.pop(thread_id, None)

    async def add_thread_item(self, thread_id: str, item: ThreadItem, context: Any) -> None:
        self.items.setdefault(thread_id, []).append(item)

    async def save_item(self, thread_id: str, item: ThreadItem, context: Any) -> None:
        lst = self.items.setdefault(thread_id, [])
        for i, existing in enumerate(lst):
            if existing.id == item.id:
                lst[i] = item
                return
        lst.append(item)

    async def load_item(self, thread_id: str, item_id: str, context: Any) -> ThreadItem:
        for it in self.items.get(thread_id, []):
            if it.id == item_id:
                return it
        raise KeyError(item_id)

    async def load_thread_items(
        self, thread_id: str, after: str | None, limit: int, order: str, context: Any
    ) -> Page:
        lst = list(self.items.get(thread_id, []))
        if (order or "asc").lower() == "desc":
            lst = lst[::-1]
        if after:
            ids = [it.id for it in lst]
            if after in ids:
                lst = lst[ids.index(after) + 1 :]
        return Page(data=lst[:limit], has_more=len(lst) > limit, after=None)

    async def delete_thread_item(self, thread_id: str, item_id: str, context: Any) -> None:
        self.items[thread_id] = [it for it in self.items.get(thread_id, []) if it.id != item_id]

    async def save_attachment(self, attachment: Attachment, context: Any) -> None:
        self.attachments[attachment.id] = attachment

    async def load_attachment(self, attachment_id: str, context: Any) -> Attachment:
        return self.attachments[attachment_id]

    async def delete_attachment(self, attachment_id: str, context: Any) -> None:
        self.attachments.pop(attachment_id, None)
