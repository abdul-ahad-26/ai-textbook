"""Ingest the Docusaurus book into Qdrant for retrieval.

Walks the book's markdown, splits it into heading-aware chunks, embeds each chunk
with OpenAI, and upserts the vectors (with source metadata) into Qdrant Cloud.

Usage (from the backend/ directory, with .env populated):

    python -m scripts.ingest
    python -m scripts.ingest --docs ../book/docs --site-url https://you.github.io/ai-textbook
"""
from __future__ import annotations

import argparse
import asyncio
import re
import sys
import uuid
from pathlib import Path

# Make the app package importable when run as a script.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from qdrant_client.http import models as qmodels  # noqa: E402

from app.config import settings  # noqa: E402
from app.embeddings import embed_texts  # noqa: E402
from app.qdrant_store import get_qdrant, ensure_collection  # noqa: E402

FRONTMATTER = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)
HEADING = re.compile(r"^#{1,3}\s+(.*)$", re.MULTILINE)
MAX_CHARS = 1100
OVERLAP = 150


def parse_frontmatter(text: str) -> tuple[dict, str]:
    m = FRONTMATTER.match(text)
    meta: dict = {}
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip().strip('"').strip("'")
        text = text[m.end():]
    return meta, text


def route_for(path: Path, docs_root: Path, meta: dict) -> str:
    """Map a docs file to its site route (routeBasePath is '/')."""
    if meta.get("slug"):
        return meta["slug"]
    rel = path.relative_to(docs_root).with_suffix("")
    parts = list(rel.parts)
    # docs/intro.mdx -> /intro ; docs/module-1-ros2/overview.md -> /module-1-ros2/overview
    return "/" + "/".join(parts)


def module_of(path: Path, docs_root: Path) -> str:
    rel = path.relative_to(docs_root)
    return rel.parts[0] if len(rel.parts) > 1 else "intro"


def chunk_text(body: str) -> list[str]:
    """Heading-aware chunking with light overlap."""
    # Split into sections at h2/h3 boundaries, keeping the heading with its section.
    sections: list[str] = []
    last = 0
    for m in HEADING.finditer(body):
        if m.start() > last:
            sections.append(body[last:m.start()].strip())
        last = m.start()
    sections.append(body[last:].strip())
    sections = [s for s in sections if s]

    chunks: list[str] = []
    for sec in sections:
        if len(sec) <= MAX_CHARS:
            chunks.append(sec)
            continue
        # Further split long sections on paragraph breaks with overlap.
        paras = re.split(r"\n\s*\n", sec)
        buf = ""
        for p in paras:
            if len(buf) + len(p) + 2 <= MAX_CHARS:
                buf = f"{buf}\n\n{p}".strip()
            else:
                if buf:
                    chunks.append(buf)
                tail = buf[-OVERLAP:] if buf else ""
                buf = (tail + "\n\n" + p).strip()
        if buf:
            chunks.append(buf)
    return chunks


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--docs", default=str(Path(__file__).resolve().parents[2] / "book" / "docs"))
    parser.add_argument("--site-url", default="", help="Prefix for citation URLs (optional)")
    parser.add_argument("--batch", type=int, default=64)
    args = parser.parse_args()

    if not settings.has_qdrant:
        print("ERROR: QDRANT_URL is not set. Populate backend/.env first.")
        sys.exit(1)

    docs_root = Path(args.docs).resolve()
    files = sorted([*docs_root.rglob("*.md"), *docs_root.rglob("*.mdx")])
    if not files:
        print(f"No markdown found under {docs_root}")
        sys.exit(1)

    await ensure_collection()
    # Fresh ingest: clear existing points so re-runs don't duplicate.
    client = get_qdrant()
    await client.delete(
        collection_name=settings.qdrant_collection,
        points_selector=qmodels.FilterSelector(filter=qmodels.Filter(must=[])),
    )

    payloads: list[dict] = []
    for f in files:
        raw = f.read_text(encoding="utf-8")
        meta, body = parse_frontmatter(raw)
        title = meta.get("title") or meta.get("sidebar_label") or f.stem
        url = (args.site_url.rstrip("/") + route_for(f, docs_root, meta)) if args.site_url else route_for(f, docs_root, meta)
        module = module_of(f, docs_root)
        for chunk in chunk_text(body):
            payloads.append({"text": chunk, "title": title, "url": url, "module": module})

    print(f"Prepared {len(payloads)} chunks from {len(files)} files. Embedding…")

    total = 0
    for i in range(0, len(payloads), args.batch):
        batch = payloads[i : i + args.batch]
        vectors = await embed_texts([p["text"] for p in batch])
        points = [
            qmodels.PointStruct(id=str(uuid.uuid4()), vector=v, payload=p)
            for v, p in zip(vectors, batch)
        ]
        await client.upsert(collection_name=settings.qdrant_collection, points=points)
        total += len(points)
        print(f"  upserted {total}/{len(payloads)}")

    print(f"Done. {total} chunks indexed in Qdrant collection '{settings.qdrant_collection}'.")


if __name__ == "__main__":
    asyncio.run(main())
