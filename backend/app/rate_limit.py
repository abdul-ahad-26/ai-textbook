"""A tiny in-process rate limiter (fixed sliding window per key).

The backend runs as a single container on Hugging Face Spaces, so an in-memory
limiter is enough to blunt cost-DoS on the paid OpenAI-backed endpoints
(/chatkit, /personalize, /translate). It is intentionally simple — not a
distributed limiter — and resets if the process restarts.
"""
from __future__ import annotations

import time
from collections import defaultdict

_BUCKETS: dict[str, list[float]] = defaultdict(list)


def allow(key: str, limit: int, window: float) -> bool:
    """Return True if this call is within `limit` requests per `window` seconds."""
    now = time.time()
    cutoff = now - window
    bucket = _BUCKETS[key]
    # Drop timestamps that fell out of the window.
    drop = 0
    for ts in bucket:
        if ts < cutoff:
            drop += 1
        else:
            break
    if drop:
        del bucket[:drop]
    if len(bucket) >= limit:
        return False
    bucket.append(now)
    return True
