from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Always find .env relative to the project root (parent of this file's directory)
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    openrouter_api_key: str
    supabase_url: str
    supabase_anon_key: str

    # Primary model — fallback list tried in order if 429/404
    # Ordered fastest → most capable
    openrouter_model: str = "meta-llama/llama-3.1-8b-instruct:free"
    openrouter_fallback_models: list[str] = [
        "google/gemma-3-4b-it:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "arcee-ai/trinity-large-preview:free",
        "google/gemma-3-12b-it:free",
    ]
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    app_name: str = "GoalFlow"
    user_id: str = "samuel"


settings = Settings()
