import json
from collections.abc import AsyncGenerator
from dataclasses import dataclass

import httpx

from config import settings

# Price per 1M tokens (input, output) in USD
_PRICING: dict[str, tuple[float, float]] = {
    "selfgpt-turbo": (0.05,   0.08),   # groq/llama-3.1-8b-instant
    "selfgpt-free":  (0.59,   0.79),   # groq/llama-3.3-70b-versatile
    "selfgpt-smart": (0.80,   4.00),   # claude-haiku-4-5
    "selfgpt-deep":  (3.00,  15.00),   # claude-sonnet-4-5
}


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
