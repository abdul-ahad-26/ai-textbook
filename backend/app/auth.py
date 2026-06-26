"""Server-side identity resolution.

The book holds a Better-Auth session token (bearer) and sends it as
`Authorization: Bearer <token>`. We VERIFY it against the shared Neon `session`
table (Better-Auth's own table) and load the user's profile from `user`.

Client-supplied identity headers (X-User-Id, X-User-Profile) are NOT trusted —
they were spoofable. Identity now comes only from a valid, unexpired session.
"""
from __future__ import annotations

from typing import Any

from fastapi import Request

from .config import settings
from . import db


def _bearer_token(request: Request) -> str | None:
    header = request.headers.get("Authorization") or ""
    if header.lower().startswith("bearer "):
        token = header[7:].strip()
        return token or None
    return None


async def resolve_identity(request: Request) -> tuple[str | None, dict[str, Any]]:
    """Return (user_id, profile) for a verified session, or (None, {}) if anonymous.

    The profile is read from the database, never from client headers, so it cannot
    be forged to coax the model into a different personalization.
    """
    token = _bearer_token(request)
    if not token or not settings.has_neon:
        return None, {}
    # Better-Auth's bearer is a SIGNED token: "<sessionToken>.<signature>". The DB's
    # session.token column holds only the part before the dot. Match either form so
    # we are robust to that detail (and to future changes).
    candidates = [token]
    if "." in token:
        candidates.append(token.split(".", 1)[0])
    pool = await db.get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT u.id AS user_id,
                   u."softwareBackground" AS sw,
                   u."hardwareBackground" AS hw,
                   u."experienceLevel"    AS lvl
            FROM session s
            JOIN "user" u ON u.id = s."userId"
            WHERE s.token = ANY($1::text[]) AND s."expiresAt" > now()
            """,
            candidates,
        )
    if row is None:
        return None, {}
    profile: dict[str, Any] = {}
    if row["sw"]:
        profile["softwareBackground"] = row["sw"]
    if row["hw"]:
        profile["hardwareBackground"] = row["hw"]
    if row["lvl"]:
        profile["experienceLevel"] = row["lvl"]
    return row["user_id"], profile
