from dataclasses import dataclass

import httpx

from config import settings


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
            "temperature": 0.7,
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
        cost = data.get("_hidden_params", {}).get("response_cost", 0.0) or 0.0

        return LLMResponse(
            content=choice,
            model=data.get("model", model),
            cost_usd=float(cost),
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
        )


litellm_service = LiteLLMService()
