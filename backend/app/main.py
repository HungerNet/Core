import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse

from app.api.v1.router import router as v1_router
from app.core.config import (
    WORKERS_DEV_ACCOUNTS_ORIGIN,
    WORKERS_DEV_ORIGIN,
    WORKERS_DEV_ORIGIN_REGEX,
    settings,
)
from app.core.middleware import (
    RedisRateLimitMiddleware,
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
)
from app.core.observability import configure_logging
from app.integrations.oauth import configured_oauth_providers

configure_logging(settings.log_level)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configured_oauth_providers(log_warnings=True)
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    if settings.rate_limit_enabled:
        await redis.ping()
    app.state.redis = redis
    try:
        yield
    finally:
        await redis.aclose()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="HungerNet platform API.",
    docs_url=None if settings.environment.lower() == "production" else "/docs",
    redoc_url=None if settings.environment.lower() == "production" else "/redoc",
    lifespan=lifespan,
)

app.include_router(v1_router, prefix=settings.api_v1_prefix)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys([
        *[origin for origin in settings.cors_allowed_origins if origin != WORKERS_DEV_ORIGIN],
        WORKERS_DEV_ACCOUNTS_ORIGIN,
    ])),
    allow_origin_regex=WORKERS_DEV_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token", "X-Request-ID"],
)

app.add_middleware(RedisRateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestContextMiddleware)


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(request: Request, exception: StarletteHTTPException) -> JSONResponse:
    detail = exception.detail if isinstance(exception.detail, str) else "Request failed"
    return JSONResponse(
        status_code=exception.status_code,
        content={
            "code": "http_error",
            "message": detail,
            "requestId": getattr(request.state, "request_id", None),
        },
        headers=exception.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exception: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "code": "validation_error",
            "message": "Request validation failed",
            "fields": [
                {"field": ".".join(str(part) for part in error["loc"]), "message": error["msg"]}
                for error in exception.errors()
            ],
            "requestId": getattr(request.state, "request_id", None),
        },
    )


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, exception: Exception) -> JSONResponse:
    logging.getLogger("hungernet.api").exception(
        "unhandled_exception",
        extra={"request_id": getattr(request.state, "request_id", None), "path": request.url.path},
    )
    return JSONResponse(
        status_code=500,
        content={
            "code": "internal_error",
            "message": "An unexpected error occurred",
            "requestId": getattr(request.state, "request_id", None),
        },
    )
