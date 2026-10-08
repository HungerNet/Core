from __future__ import annotations

import logging
import time
import uuid
from typing import Any

from fastapi import Request
from redis.exceptions import RedisError
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response

from app.core.config import settings

logger = logging.getLogger("hungernet.api")

_RATE_SCRIPT = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local cutoff = now - tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', key, 0, cutoff)
local count = redis.call('ZCARD', key)
if count >= limit then
  return 0
end
redis.call('ZADD', key, now, ARGV[4])
redis.call('PEXPIRE', key, tonumber(ARGV[2]))
return count + 1
"""


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = request_id
        started = time.monotonic()
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "request_complete",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round((time.monotonic() - started) * 1000, 2),
            },
        )
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'")
        response.headers.setdefault("Cache-Control", "no-store")
        if request.url.scheme == "https":
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        if "Server" in response.headers:
            del response.headers["Server"]
        return response


class RedisRateLimitMiddleware(BaseHTTPMiddleware):
    def _bucket(self, request: Request) -> str | None:
        path = request.url.path
        method = request.method.upper()
        if path.startswith("/api/v1/auth/oauth/"):
            return f"oauth:{path}"
        if method == "POST" and path in {
            "/api/v1/auth/register",
            "/api/v1/auth/login",
            "/api/v1/auth/mfa/setup",
            "/api/v1/auth/mfa/verify",
        }:
            return f"auth:{path}"
        if method in {"POST", "PATCH", "PUT", "DELETE"} and path.startswith("/api/v1/users/me"):
            return "user-mutations"
        if method in {"POST", "PATCH", "PUT", "DELETE"} and path.startswith("/api/v1/announcements"):
            return "announcement-mutations"
        if path.startswith("/api/v1/admin/"):
            return "admin"
        return None

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not settings.rate_limit_enabled:
            return await call_next(request)

        bucket = self._bucket(request)
        if bucket is None:
            return await call_next(request)

        redis: Any = getattr(request.app.state, "redis", None)
        if redis is None:
            logger.error("rate_limit_redis_unavailable", extra={"path": request.url.path})
            return JSONResponse(
                status_code=503,
                content={"code": "rate_limit_unavailable", "message": "Request protection is unavailable"},
            )

        client_ip = request.client.host if request.client else "unknown"
        window_ms = settings.rate_limit_window_seconds * 1000
        now_ms = int(time.time() * 1000)
        key = f"hungernet:ratelimit:{bucket}:{client_ip}"
        try:
            count = await redis.eval(
                _RATE_SCRIPT,
                1,
                key,
                now_ms,
                window_ms,
                settings.rate_limit_requests,
                uuid.uuid4().hex,
            )
        except RedisError:
            logger.exception("rate_limit_redis_error", extra={"path": request.url.path})
            return JSONResponse(
                status_code=503,
                content={"code": "rate_limit_unavailable", "message": "Request protection is unavailable"},
            )

        if int(count) == 0:
            return JSONResponse(
                status_code=429,
                content={"code": "rate_limited", "message": "Too many requests"},
                headers={"Retry-After": str(settings.rate_limit_window_seconds)},
            )
        return await call_next(request)
