"""Central configuration, loaded from environment variables.

Every external dependency the hackathon mandates is wired here:
  - OpenAI (Agents SDK + ChatKit + embeddings)
  - Qdrant Cloud (vector store)
  - Neon Serverless Postgres (threads, items, analytics)
"""
from __future__ import annotations

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ---- OpenAI ----
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1"                 # chat/agent model
    openai_embedding_model: str = "text-embedding-3-small"
    embedding_dim: int = 1536

    # ---- Qdrant Cloud (free tier) ----
    qdrant_url: str = ""                          # https://xxxx.cloud.qdrant.io
    qdrant_api_key: str = ""
    qdrant_collection: str = "physical_ai_book"

    # ---- Neon Serverless Postgres ----
    # postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require
    database_url: str = ""

    # ---- App ----
    # Comma-separated list of allowed CORS origins (the book + auth server).
    cors_origins: str = "http://localhost:3000,http://localhost:3001"
    # Regex for additional allowed origins. Tightened to the production hosts only
    # (GitHub Pages + Hugging Face Spaces); dev tunnels are no longer wildcarded.
    cors_origin_regex: str = r"^https://[a-z0-9-]+\.github\.io$|^https://[a-z0-9-]+\.hf\.space$"
    # When DATABASE_URL is unset we fall back to an in-memory thread store so the
    # backend still runs for a quick local smoke test.
    use_memory_store_fallback: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def has_qdrant(self) -> bool:
        return bool(self.qdrant_url)

    @property
    def has_neon(self) -> bool:
        return bool(self.database_url)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

# The OpenAI Agents SDK constructs its own client from the OPENAI_API_KEY env var
# (not our Settings). When the key comes from a .env file, mirror it into the
# process environment so the agent works the same as embeddings/personalize.
import os  # noqa: E402

if settings.openai_api_key and not os.environ.get("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = settings.openai_api_key
