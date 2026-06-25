"""The self-hosted ChatKit server.

`respond()` is invoked for every user message. It builds the RAG agent (tuned to
the reader's selected text + background), runs it with the OpenAI Agents SDK, and
streams the result back to the ChatKit widget as ThreadStreamEvents.
"""
from __future__ import annotations

from typing import Any, AsyncIterator

from agents import Runner
from chatkit.server import ChatKitServer
from chatkit.agents import AgentContext, stream_agent_response
from chatkit.types import ThreadMetadata, ThreadStreamEvent, UserMessageItem

from .agent import RequestContext, build_book_agent


def _title_from(text: str, max_len: int = 48) -> str:
    """Derive a short thread title from the first user message."""
    title = " ".join(text.strip().split())
    if len(title) > max_len:
        title = title[:max_len].rstrip() + "…"
    return title or "New chat"


def _extract_text(item: Any) -> str:
    """Flatten a ChatKit message item's content into plain text (defensive)."""
    content = getattr(item, "content", None)
    if content is None:
        return str(getattr(item, "text", "") or "")
    if isinstance(content, str):
        return content
    parts: list[str] = []
    for part in content:
        text = getattr(part, "text", None)
        if text:
            parts.append(text)
        elif isinstance(part, dict) and part.get("text"):
            parts.append(part["text"])
    return "\n".join(parts)


class BookChatKitServer(ChatKitServer):
    """ChatKit server backed by the OpenAI Agents SDK + Qdrant retrieval."""

    async def respond(
        self,
        thread: ThreadMetadata,
        input_user_message: UserMessageItem | None,
        context: RequestContext,
    ) -> AsyncIterator[ThreadStreamEvent]:
        # The per-request context (user, profile, selected text) was attached by the
        # FastAPI layer and travels through process() to here.
        agent = build_book_agent(context)

        user_text = _extract_text(input_user_message) if input_user_message else ""

        # Give the thread an identity from the first user message so it shows a
        # meaningful title in the history list (ChatKit does not auto-title in the
        # self-hosted flow — untitled threads otherwise appear blank).
        if user_text and not getattr(thread, "title", None):
            thread.title = _title_from(user_text)
            try:
                await self.store.save_thread(thread, context)
            except Exception:  # never let titling break the actual answer
                pass

        agent_context = AgentContext(
            thread=thread,
            store=self.store,
            request_context=context,
        )

        # Run the agent with streaming and convert its output into ChatKit events.
        result = Runner.run_streamed(agent, input=user_text, context=agent_context)
        async for event in stream_agent_response(agent_context, result):
            yield event
