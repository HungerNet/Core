import re

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

WORKERS_DEV_ORIGIN = "https://*.millered001.workers.dev"
WORKERS_DEV_ACCOUNTS_ORIGIN = "https://accounts.millered001.workers.dev"
WORKERS_DEV_ORIGIN_REGEX = (
    r"(?i)^https://(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+"
    r"millered001\.workers\.dev$"
)
_WORKERS_DEV_ORIGIN_PATTERN = re.compile(WORKERS_DEV_ORIGIN_REGEX)


def is_workers_dev_origin(origin: str) -> bool:
    return _WORKERS_DEV_ORIGIN_PATTERN.fullmatch(origin) is not None


def is_allowed_origin(origin: str, allowed_origins: list[str]) -> bool:
    return origin in allowed_origins or is_workers_dev_origin(origin)


class Settings(BaseSettings):
    app_name: str = "HungerNet Platform API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+asyncpg://hungernet:local-development-only@localhost:5432/hungernet"
    jwt_secret: str = "development-only-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 60
    recent_auth_window_minutes: int = Field(default=10, ge=1, le=60)
    trust_host: str = "https://auth.hungernet.dev"
    allowed_oauth_providers: list[str] = Field(default_factory=lambda: ["google", "github", "discord"])
    google_client_id: str | None = None
    google_client_secret: SecretStr | None = None
    github_client_id: str | None = None
    github_client_secret: SecretStr | None = None
    discord_client_id: str | None = None
    discord_client_secret: SecretStr | None = None
    oauth_callback_base_url: str = "https://auth.hungernet.dev/api/v1"
    allowed_return_origins: list[str] = Field(default_factory=lambda: [
        "https://accounts.hungernet.dev",
        "https://admin.hungernet.dev",
        "https://hungernet.dev",
        "https://hungersmp.com",
        "https://ifamished.com",
        "https://optifineforfabric.com",
        WORKERS_DEV_ACCOUNTS_ORIGIN,
        WORKERS_DEV_ORIGIN,
    ])
    oauth_app_redirect_uris: dict[str, list[str]] = Field(default_factory=lambda: {
        "admin": ["https://admin.hungernet.dev/auth/callback", "http://localhost:4173/auth/callback"],
        "hungernet": ["https://hungernet.dev/auth/callback", "http://localhost:4181/auth/callback"],
        "hungersmp": ["https://hungersmp.com/auth/callback", "http://localhost:4182/auth/callback"],
        "ifamished": ["https://ifamished.com/auth/callback", "http://localhost:4180/auth/callback"],
        "optifineforfabric": ["https://optifineforfabric.com/auth/callback", "http://localhost:4183/auth/callback"],
    })
    cors_allowed_origins: list[str] = Field(default_factory=list)
    session_cookie_name: str = "hungernet_session"
    csrf_cookie_name: str = "hungernet_csrf"
    session_cookie_secure: bool = True
    session_cookie_same_site: str = "lax"
    session_cookie_domain: str | None = None
    redis_url: str = "redis://redis:6379/0"
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 60
    rate_limit_window_seconds: int = 60
    log_level: str = "INFO"
    model_config = SettingsConfigDict(extra="ignore")

    @model_validator(mode="after")
    def require_production_session_secret(self) -> "Settings":
        if self.environment.lower() == "production" and (
            len(self.jwt_secret) < 32 or self.jwt_secret == "development-only-change-me"
        ):
            raise ValueError("JWT_SECRET must be a unique secret of at least 32 characters in production")
        if self.environment.lower() == "production" and not self.session_cookie_secure:
            raise ValueError("SESSION_COOKIE_SECURE must be true in production")
        if self.session_cookie_same_site.lower() not in {"lax", "strict", "none"}:
            raise ValueError("SESSION_COOKIE_SAME_SITE must be lax, strict, or none")
        if self.session_cookie_same_site.lower() == "none" and not self.session_cookie_secure:
            raise ValueError("SameSite=None cookies require secure transport")
        origin_lists = [self.cors_allowed_origins, self.allowed_return_origins]
        if any(
            "*" in origin and origin != WORKERS_DEV_ORIGIN
            for origins in origin_lists
            for origin in origins
        ):
            raise ValueError("Only the Millered workers.dev origin wildcard is supported")
        if self.environment.lower() == "production":
            if not self.cors_allowed_origins:
                raise ValueError("CORS_ALLOWED_ORIGINS must be configured in production")
        return self


settings = Settings()
