"""Redis cache with explicit namespaces and safe failure behaviour."""
from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger("copilot.cache")


class RedisCache:
    def __init__(self, url: str | None, prefix: str = "electroshop") -> None:
        self._url = url
        self._prefix = prefix
        self._client: Any | None = None

    async def connect(self) -> None:
        if not self._url:
            logger.info("Redis cache disabled: REDIS_URL is not configured")
            return
        try:
            from redis.asyncio import Redis
            self._client = Redis.from_url(self._url, encoding="utf-8", decode_responses=True, socket_connect_timeout=2)
            await self._client.ping()
            logger.info("Redis cache connected")
        except Exception:
            logger.exception("Redis unavailable; continuing without cache")
            self._client = None

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()

    async def get(self, namespace: str, key: str) -> Any | None:
        if self._client is None:
            return None
        try:
            value = await self._client.get(self._key(namespace, key))
            return json.loads(value) if value else None
        except Exception:
            logger.warning("Redis read failed", exc_info=True)
            return None

    async def set(self, namespace: str, key: str, value: Any, ttl_seconds: int) -> None:
        if self._client is None:
            return
        try:
            await self._client.set(self._key(namespace, key), json.dumps(value, default=str, separators=(",", ":")), ex=ttl_seconds)
        except Exception:
            logger.warning("Redis write failed", exc_info=True)

    async def delete_prefix(self, namespace: str, prefix: str) -> None:
        if self._client is None:
            return
        try:
            async for key in self._client.scan_iter(match=f"{self._key(namespace, prefix)}*"):
                await self._client.delete(key)
        except Exception:
            logger.warning("Redis invalidation failed", exc_info=True)

    def _key(self, namespace: str, key: str) -> str:
        return f"{self._prefix}:{namespace}:{key}"
