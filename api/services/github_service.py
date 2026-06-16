import logging
import time
from typing import Any

import httpx

from config import settings

logger = logging.getLogger(__name__)

_GITHUB_API = "https://api.github.com"
_TIMEOUT = 8.0
_ACTIVITY_TTL = 600   # 10 min
_REPOS_TTL = 900      # 15 min


class GithubService:
    def __init__(self) -> None:
        self._activity_cache: tuple[float, str] | None = None
        self._repos_cache: tuple[float, str] | None = None

    def _headers(self) -> dict[str, str]:
        h = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
        if settings.github_token:
            h["Authorization"] = f"Bearer {settings.github_token}"
        return h

    async def get_recent_activity(self, limit: int = 10) -> str:
        if self._activity_cache:
            ts, data = self._activity_cache
            if time.time() - ts < _ACTIVITY_TTL:
                return data

        if not settings.github_username:
            return ""

        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                resp = await client.get(
                    f"{_GITHUB_API}/users/{settings.github_username}/events",
                    headers=self._headers(),
                    params={"per_page": limit},
                )
                resp.raise_for_status()
                events: list[dict[str, Any]] = resp.json()
        except Exception:
            logger.exception("GitHub activity fetch failed")
            return self._activity_cache[1] if self._activity_cache else ""

        lines: list[str] = []
        for ev in events[:limit]:
            etype = ev.get("type", "")
            repo = ev.get("repo", {}).get("name", "")
            payload = ev.get("payload", {})
            if etype == "PushEvent":
                commits = payload.get("commits", [])
                msg = commits[0].get("message", "").split("\n")[0][:72] if commits else ""
                if msg:
                    lines.append(f"• pushed to {repo}: {msg}")
            elif etype == "PullRequestEvent":
                action = payload.get("action", "")
                title = payload.get("pull_request", {}).get("title", "")[:72]
                lines.append(f"• {action} PR in {repo}: {title}")
            elif etype == "CreateEvent":
                ref_type = payload.get("ref_type", "")
                ref = payload.get("ref") or ""
                lines.append(f"• created {ref_type} {ref} in {repo}".strip())

        result = "\n".join(lines[:8]) if lines else ""
        self._activity_cache = (time.time(), result)
        return result

    async def get_top_repos(self, limit: int = 6) -> str:
        if self._repos_cache:
            ts, data = self._repos_cache
            if time.time() - ts < _REPOS_TTL:
                return data

        if not settings.github_username:
            return ""

        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                resp = await client.get(
                    f"{_GITHUB_API}/users/{settings.github_username}/repos",
                    headers=self._headers(),
                    params={"sort": "updated", "per_page": limit, "type": "owner"},
                )
                resp.raise_for_status()
                repos: list[dict[str, Any]] = resp.json()
        except Exception:
            logger.exception("GitHub repos fetch failed")
            return self._repos_cache[1] if self._repos_cache else ""

        lines: list[str] = []
        for r in repos[:limit]:
            name = r.get("name", "")
            desc = (r.get("description") or "")[:60]
            stars = r.get("stargazers_count", 0)
            lang = r.get("language") or ""
            pushed = (r.get("pushed_at") or "")[:10]
            star_str = f" {stars}⭐" if stars else ""
            lang_str = f" · {lang}" if lang else ""
            desc_str = f" — {desc}" if desc else ""
            lines.append(f"• {name}{star_str}{lang_str} · last push {pushed}{desc_str}")

        result = "\n".join(lines) if lines else ""
        self._repos_cache = (time.time(), result)
        return result


github_service = GithubService()
