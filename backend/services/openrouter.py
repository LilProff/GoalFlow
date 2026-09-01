"""
Centralized OpenRouter AI service.
Single source of truth — no more duplicate call_ai() in every router.
"""
import httpx
from config import settings


async def call_ai(
    prompt: str,
    *,
    max_tokens: int = 350,
    temperature: float = 0.5,
    system: str | None = None,
    smart: bool = False,          # True → use the heavy model (kimi-k2.5)
) -> str:
    """
    Call OpenRouter with automatic model fallback.

    Args:
        prompt:      User / human turn content.
        max_tokens:  Max tokens in the response.
        temperature: Sampling temperature.
        system:      Optional system prompt.
        smart:       Use the smarter (but slower) model instead of fast models.

    Returns:
        The AI response string, or a fallback message on total failure.
    """
    if smart:
        models = [settings.openrouter_smart_model] + settings.openrouter_fallback_models
    else:
        models = [settings.openrouter_model] + settings.openrouter_fallback_models

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://goalflow.app",
        "X-Title": settings.app_name,
    }

    failures: list[str] = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        for model in models:
            try:
                resp = await client.post(
                    f"{settings.openrouter_base_url}/chat/completions",
                    headers=headers,
                    json={
                        "model": model,
                        "messages": messages,
                        "max_tokens": max_tokens,
                        "temperature": temperature,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    # A handful of OpenRouter's free models return HTTP 200
                    # with a null/empty message body instead of an error —
                    # treating that as success silently "worked" while
                    # actually returning nothing. Fall through to the next
                    # model instead.
                    if content:
                        return content
                    failures.append(f"{model}: empty content")
                    continue
                if resp.status_code in (429, 404, 503):
                    failures.append(f"{model}: HTTP {resp.status_code}")
                    continue  # try next model
                # Unexpected error — raise immediately
                resp.raise_for_status()
            except httpx.TimeoutException:
                failures.append(f"{model}: timeout")
                continue
            except httpx.HTTPStatusError as e:
                failures.append(f"{model}: {e}")
                continue
            except Exception as e:
                failures.append(f"{model}: {e}")
                continue

    # Every candidate failed — this is the one place that's genuinely worth
    # knowing about at a glance in server logs, since the user just sees a
    # generic fallback message with no clue why.
    print(f"[openrouter] all models failed: {failures}")
    return "I'm having a moment. Please try again shortly."


async def call_ai_json(
    prompt: str,
    *,
    max_tokens: int = 600,
    temperature: float = 0.3,
    system: str | None = None,
    smart: bool = True,
) -> str:
    """
    Like call_ai but hints the model to return JSON.
    Caller is responsible for parsing the response.
    """
    json_system = (
        (system + "\nRespond with valid JSON only. No markdown, no explanation.")
        if system
        else "Respond with valid JSON only. No markdown, no explanation."
    )
    return await call_ai(
        prompt,
        max_tokens=max_tokens,
        temperature=temperature,
        system=json_system,
        smart=smart,
    )
