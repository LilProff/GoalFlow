from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from supabase import create_client, Client

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Supabase ──────────────────────────────────────────────────────
    supabase_url: str
    supabase_service_key: str
    supabase_anon_key: str = ""

    # ── Clerk Auth ────────────────────────────────────────────────────
    # Secret key for server-side Clerk verification (optional — we decode
    # without signature verification since Clerk's frontend SDK already
    # validates tokens before they reach our API)
    clerk_secret_key: str = ""
    clerk_publishable_key: str = ""

    # ── OpenRouter (AI) ───────────────────────────────────────────────
    openrouter_api_key: str
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    # Primary model (fastest free model for real-time chat)
    openrouter_model: str = "meta-llama/llama-3.1-8b-instruct:free"
    # Fallback models tried in order
    openrouter_fallback_models: list[str] = [
        "google/gemma-3-4b-it:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "arcee-ai/trinity-large-preview:free",
        "google/gemma-3-12b-it:free",
    ]
    # Heavier model for reports / goal planning
    openrouter_smart_model: str = "moonshotai/kimi-k2.5"

    # ── App ────────────────────────────────────────────────────────────
    app_name: str = "GoalFlow"
    jwt_secret: str = "change-me-in-production"

    # ── Paystack (Nigeria payments) ────────────────────────────────────
    paystack_secret_key: str = ""
    paystack_public_key: str = ""

    # ── Push Notifications ─────────────────────────────────────────────
    expo_push_url: str = "https://exp.host/--/api/v2/push/send"

    # ── CORS ───────────────────────────────────────────────────────────
    # Override per-deployment via ALLOWED_ORIGINS in .env, e.g.
    #   ALLOWED_ORIGINS=["https://goalflow.app"]
    # Defaults cover local dev on the ports start.bat uses.
    allowed_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """Singleton Supabase service-role client (bypasses RLS)."""
    s = Settings()
    return create_client(s.supabase_url, s.supabase_service_key)


settings = Settings()
