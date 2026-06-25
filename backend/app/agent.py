"""The book's RAG agent, built on the OpenAI Agents SDK.

The agent answers questions about the textbook by retrieving relevant passages
from Qdrant. Two special behaviours required by the hackathon:

  * Selected-text scoping — if the reader highlighted text, the agent answers
    based ONLY on that selection.
  * Personalization — if the reader is signed in, their software/hardware
    background tunes the explanation level.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from agents import Agent, RunContextWrapper, function_tool

from .config import settings
from .qdrant_store import search, format_context


@dataclass
class RequestContext:
    """Per-request context threaded from the HTTP layer into the agent run."""
    user_id: str | None = None
    profile: dict[str, Any] = field(default_factory=dict)
    selected_text: str | None = None
    # Absolute base of the book site (origin + baseUrl), e.g.
    # "http://localhost:3000/ai-textbook" — used to build clickable citation links.
    site_base: str = ""


def _site_base_from(wrapper: RunContextWrapper[Any]) -> str:
    """Pull the site base out of whatever context object the run was given.

    The agent runs with ChatKit's AgentContext, which carries our RequestContext on
    `.request_context`; fall back gracefully if the shape differs.
    """
    ctx = getattr(wrapper, "context", None)
    req = getattr(ctx, "request_context", ctx)
    return getattr(req, "site_base", "") or ""


@function_tool
async def search_book(wrapper: RunContextWrapper[Any], query: str) -> str:
    """Search the Physical AI & Humanoid Robotics textbook for passages relevant to the query.

    Always call this before answering a question about the book's content. Returns the most
    relevant passages with their source titles and absolute URLs so you can cite them.
    """
    chunks = await search(query, limit=6)
    return format_context(chunks, site_base=_site_base_from(wrapper))


BASE_INSTRUCTIONS = """\
You are the teaching assistant embedded in the AI-native textbook
"Physical AI & Humanoid Robotics". You help readers understand embodied
intelligence, ROS 2, Gazebo/Unity simulation, NVIDIA Isaac, and
Vision-Language-Action (VLA) systems.

Rules:
- Answer using the textbook's content. Call the `search_book` tool to retrieve
  relevant passages before answering questions about the material.
- Be accurate and concise. Prefer the book's own framing and terminology.
- When you use a retrieved passage, cite its source as a markdown link, using the
  source URL EXACTLY as provided by the tool (it is an absolute https URL — use it
  verbatim, do not alter or shorten it).
- If the book does not cover something, say so briefly, then give a careful
  general answer and mark it as outside the book.
- Use short paragraphs, lists, and fenced code blocks where helpful.
"""


def _profile_note(profile: dict[str, Any]) -> str:
    if not profile:
        return ""
    sw = profile.get("softwareBackground") or profile.get("software_background")
    hw = profile.get("hardwareBackground") or profile.get("hardware_background")
    lvl = profile.get("experienceLevel") or profile.get("experience_level")
    bits = []
    if lvl:
        bits.append(f"overall experience level: {lvl}")
    if sw:
        bits.append(f"software background: {sw}")
    if hw:
        bits.append(f"hardware/robotics background: {hw}")
    if not bits:
        return ""
    return (
        "\n\nThe reader has shared their background — tailor depth and analogies to it "
        "(do not condescend to experts; do not overwhelm beginners): " + "; ".join(bits) + "."
    )


def _selection_note(selected_text: str | None) -> str:
    if not selected_text or not selected_text.strip():
        return ""
    snippet = selected_text.strip()
    if len(snippet) > 4000:
        snippet = snippet[:4000] + " …"
    return (
        "\n\nIMPORTANT — the reader has highlighted the following passage and is asking about it. "
        "Base your answer primarily on THIS selected text. You may call `search_book` only to add "
        "supporting context, but the selection is the subject of the question:\n\n"
        f'"""\n{snippet}\n"""'
    )


def build_book_agent(ctx: RequestContext) -> Agent:
    """Construct the agent for a single request, with instructions tuned to context."""
    instructions = BASE_INSTRUCTIONS + _profile_note(ctx.profile) + _selection_note(ctx.selected_text)
    return Agent(
        name="Physical AI Tutor",
        instructions=instructions,
        model=settings.openai_model,
        tools=[search_book],
    )
