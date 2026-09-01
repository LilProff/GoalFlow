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

    # ── OpenRouter (AI) ───────────────────────────────────────────────
    openrouter_api_key: str
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    # OpenRouter's free-tier catalog rotates — models get deprecated/renamed
    # every so often, and every slug that used to be here (llama-3.1-8b,
    # gemma-3-4b/12b, llama-3.3-70b, arcee trinity) now 404s. These were
    # re-verified directly against /chat/completions on 2026-09-01: each
    # returned real, non-empty content in under 4s. If they start failing
    # again, re-check https://openrouter.ai/models?max_price=0 for current
    # slugs rather than assuming the code is broken.
    openrouter_model: str = "google/gemma-4-26b-a4b-it:free"
    # Fallback models tried in order
    openrouter_fallback_models: list[str] = [
        "google/gemma-4-31b-it:free",
        "minimax/minimax-m3:free",
        "poolside/laguna-s-2.1:free",
        "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    ]
    # Heavier model for reports / goal planning — still free-tier; not the
    # fastest option but comfortably capable enough for a periodic weekly
    # report rather than real-time chat.
    openrouter_smart_model: str = "google/gemma-4-31b-it:free"

    # ── App ────────────────────────────────────────────────────────────
    app_name: str = "GoalFlow"
    jwt_secret: str = "change-me-in-production"

    # ── Paystack (Nigeria payments) ────────────────────────────────────
    paystack_secret_key: str = ""
    paystack_public_key: str = ""

    # ── Push Notifications ─────────────────────────────────────────────
    expo_push_url: str = "https://exp.host/--/api/v2/push/send"
    # Web Push (VAPID) — used by the PWA today. vapid_public_key must match
    # VITE_VAPID_PUBLIC_KEY on the frontend (same key pair); vapid_private_key
    # is a real secret. Push sending is skipped (not an error) when unset, so
    # local dev works without generating a key pair.
    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_subject: str = ""

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
