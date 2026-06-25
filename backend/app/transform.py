"""Chapter transforms: personalize to the reader's background, and translate to Urdu.

Both take the chapter's markdown and return transformed markdown, preserving
structure (headings, lists, fenced code blocks). Powered by the same OpenAI
models the agent uses.
"""
from __future__ import annotations

from typing import Any

from .config import settings
from .embeddings import get_openai

MAX_CHARS = 24000  # keep a single chapter within a comfortable context budget


def _clamp(text: str) -> str:
    return text if len(text) <= MAX_CHARS else text[:MAX_CHARS]


def _profile_line(profile: dict[str, Any]) -> str:
    sw = profile.get("softwareBackground") or profile.get("software_background") or "unspecified"
    hw = profile.get("hardwareBackground") or profile.get("hardware_background") or "unspecified"
    lvl = profile.get("experienceLevel") or profile.get("experience_level") or "unspecified"
    return f"Experience level: {lvl}. Software background: {sw}. Hardware/robotics background: {hw}."


async def personalize_chapter(content: str, profile: dict[str, Any]) -> str:
    system = (
        "You adapt a chapter of the technical textbook 'Physical AI & Humanoid Robotics' "
        "to an individual reader's background. Rewrite the chapter so the depth, pacing, and "
        "analogies fit this reader. Rules:\n"
        "- Preserve all section headings and the overall structure.\n"
        "- Keep every code block; you may add a short clarifying comment but do not break the code.\n"
        "- For beginners: expand jargon, add intuition and analogies, slow down.\n"
        "- For experts: be concise, skip basics, add depth, cross-references, and caveats.\n"
        "- Do not invent facts beyond the chapter's scope. Return GitHub-flavored Markdown only."
    )
    user = f"Reader profile: {_profile_line(profile)}\n\n--- CHAPTER MARKDOWN ---\n{_clamp(content)}"
    resp = await get_openai().chat.completions.create(
        model=settings.openai_model,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.4,
    )
    return resp.choices[0].message.content or content


async def translate_to_urdu(content: str) -> str:
    system = (
        "You are an expert technical translator. Translate the given textbook chapter from "
        "English into clear, natural Urdu (اردو). Rules:\n"
        "- Preserve all Markdown structure: headings, lists, tables, links, and fenced code blocks.\n"
        "- Do NOT translate code inside code blocks, command names, or API identifiers; translate "
        "only comments and prose.\n"
        "- Keep widely-used technical terms (ROS 2, LiDAR, URDF, VSLAM, GPU) in English where Urdu "
        "has no established equivalent, optionally with a short Urdu gloss in parentheses.\n"
        "- Output valid GitHub-flavored Markdown in Urdu, right-to-left friendly."
    )
    resp = await get_openai().chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": _clamp(content)},
        ],
        temperature=0.2,
    )
    return resp.choices[0].message.content or content
