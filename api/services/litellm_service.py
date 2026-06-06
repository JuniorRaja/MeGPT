import json
from collections.abc import AsyncGenerator
from dataclasses import dataclass

import httpx

from config import settings

# Price per 1M tokens (input, output) in USD — Groq published rates
_PRICING: dict[str, tuple[float, float]] = {
    "llama-3.1-8b-instant":                      (0.05,  0.08),
    "allam-2-7b":                                 (0.02,  0.02),
    "llama-3.3-70b-versatile":                    (0.59,  0.79),
    "meta-llama/llama-4-scout-17b-16e-instruct":  (0.11,  0.34),
    "qwen/qwen3-32b":                             (0.29,  0.59),
    "claude-haiku-4-5-20251001":                  (0.80,  4.00),
    "claude-sonnet-4-5-20251001":                 (3.00, 15.00),
}

# In-memory cache of x-ratelimit-remaining-requests (RPD) per Groq model.
# Updated on every successful response; used to proactively skip exhausted models.
_groq_remaining: dict[str, int] = {}


def _capture_rl_headers(model: str, headers: httpx.Headers) -> None:
    value = headers.get("x-ratelimit-remaining-requests")
    if value is not None:
        try:
            _groq_remaining[model] = int(value)
        except (ValueError, TypeError):
            pass


def groq_remaining_requests(model: str) -> int | None:
    """Return cached remaining-requests (RPD) for a Groq model, or None if unknown."""
    return _groq_remaining.get(model)


def _compute_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    input_price, output_price = _PRICING.get(model, (0.0, 0.0))
    return (prompt_tokens * input_price + completion_tokens * output_price) / 1_000_000


def estimate_cost(model: str, input_text: str, output_text: str) -> float:
    prompt_tokens = max(1, len(input_text) // 4)
    completion_tokens = max(1, len(output_text) // 4)
    return _compute_cost(model, prompt_tokens, completion_tokens)


@dataclass
class LLMResponse:
    content: str
    model: str
    cost_usd: float
    prompt_tokens: int
    completion_tokens: int


class LiteLLMService:
    def __init__(self) -> None:
        self.base_url = settings.litellm_url
        self.headers = {
            "Authorization": f"Bearer {settings.litellm_master_key}",
            "Content-Type": "application/json",
        }

    async def chat(
        self,
        messages: list[dict],
        model: str | None = None,
    ) -> LLMResponse:
        model = model or settings.default_model
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.85,
            "max_tokens": 600,
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
            )
            resp.raise_for_status()
            _capture_rl_headers(model, resp.headers)
            data = resp.json()

        choice = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)

        return LLMResponse(
            content=choice,
            model=data.get("model", model),
            cost_usd=_compute_cost(model, prompt_tokens, completion_tokens),
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
        )

    async def stream(
        self,
        messages: list[dict],
        model: str | None = None,
    ) -> AsyncGenerator[str, None]:
        model = model or settings.default_model
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.85,
            "max_tokens": 600,
            "stream": True,
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
            ) as resp:
                resp.raise_for_status()
                _capture_rl_headers(model, resp.headers)
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    chunk = line[6:]
                    if chunk == "[DONE]":
                        break
                    try:
                        data = json.loads(chunk)
                        delta = data["choices"][0]["delta"].get("content", "")
                        if delta:
                            yield delta
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue


litellm_service = LiteLLMService()
