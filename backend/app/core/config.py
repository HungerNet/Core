from collections.abc import Collection
from pathlib import Path
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

WORKERS_DEV_ACCOUNT_ORIGIN = "https://account.millered001.workers.dev"
NORMAL_ALLOWED_ORIGINS = (
    "https://account.hungernet.dev",
    "https://hungernet.dev",
    "https://admin.hungernet.dev",
    "https://ifamished.com",
    "https://optifineforfabric.com",
    "https://hungersmp.com",
)
WORKERS_DEV_ALLOWED_ORIGINS = (
    WORKERS_DEV_ACCOUNT_ORIGIN,
    "https://hungernet.millered001.workers.dev",
    "https://admin.millered001.workers.dev",
    "https://ifamished.millered001.workers.dev",
    "https://optifineforfabric.millered001.workers.dev",
    "https://hungersmp.millered001.workers.dev",
)
LOCAL_DEV_ALLOWED_ORIGINS = tuple(
    f"http://localhost:{port}" for port in (4173, 4174, 4180, 4181, 4182, 4183)
)
CORS_ORIGINS = NORMAL_ALLOWED_ORIGINS + WORKERS_DEV_ALLOWED_ORIGINS + LOCAL_DEV_ALLOWED_ORIGINS
RETURN_ORIGINS = CORS_ORIGINS
OAUTH_CALLBACK_ENDPOINT = "https://api.hungernet.dev/api/v1"
APP_CALLBACKS = {
    "admin": [
        "https://admin.hungernet.dev/auth/callback",
        "https://admin.millered001.workers.dev/auth/callback",
        "http://localhost:4173/auth/callback",
    ],
    "hungernet": [
        "https://hungernet.dev/auth/callback",
        "https://hungernet.millered001.workers.dev/auth/callback",
        "http://localhost:4181/auth/callback",
    ],
    "hungersmp": [
        "https://hungersmp.com/auth/callback",
        "https://hungersmp.millered001.workers.dev/auth/callback",
        "http://localhost:4182/auth/callback",
    ],
    "ifamished": [
        "https://ifamished.com/auth/callback",
        "https://ifamished.millered001.workers.dev/auth/callback",
        "http://localhost:4180/auth/callback",
    ],
    "optifineforfabric": [
        "https://optifineforfabric.com/auth/callback",
        "https://optifineforfabric.millered001.workers.dev/auth/callback",
        "http://localhost:4183/auth/callback",
    ],
}
NORMAL_SHARED_COOKIE_DOMAIN = ".hungernet.dev"
API_ROUTE_PREFIX = "/api/v1"


def is_workers_dev_origin(origin: str) -> bool:
    try:
        parsed = urlsplit(origin)
        return (
            parsed.scheme == "https"
            and bool(parsed.hostname)
            and parsed.hostname.lower().endswith(".workers.dev")
            and parsed.hostname.count(".") >= 2
            and parsed.port is None
            and parsed.username is None
            and parsed.password is None
            and parsed.path in {"", "/"}
            and not parsed.query
            and not parsed.fragment
        )
    except ValueError:
        return False


def is_allowed_origin(origin: str, allowed_origins: Collection[str]) -> bool:
    return origin in allowed_origins


class Settings(BaseSettings):
    app_name: str = "HungerNet Platform API"
    database_url: str = "postgresql+asyncpg://hungernet:local-development-only@localhost:5432/hungernet"
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expiry_minutes: int = Field(default=15, ge=1, le=60)
    session_expiry_days: int = Field(default=90, ge=1, le=365)
    recent_auth_window_minutes: int = Field(default=10, ge=1, le=60)
    allowed_oauth_providers: list[str] = Field(
        default_factory=lambda: ["google", "github", "discord", "microsoft"]
    )
    superuser_id: str | None = None
    superuser_username: str | None = None
    superuser_password: SecretStr | None = None
    session_cookie_name: str = "hungernet_session"
    csrf_cookie_name: str = "hungernet_csrf"
    session_cookie_secure: bool = True
    session_cookie_same_site: str = "lax"
    redis_url: str = "redis://redis:6379/0"
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 60
    rate_limit_window_seconds: int = 60
    avatar_storage_dir: Path = Path("media")
    avatar_public_base_url: str = "https://api.hungernet.dev"
    log_level: str = "INFO"
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[3] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def require_production_security(self) -> "Settings":
        if len(self.jwt_secret) < 32:
            raise ValueError("JWT_SECRET must be a unique secret of at least 32 characters")
        if not self.session_cookie_secure:
            raise ValueError("SESSION_COOKIE_SECURE must be true")
        if self.session_cookie_same_site.lower() not in {"lax", "strict", "none"}:
            raise ValueError("SESSION_COOKIE_SAME_SITE must be lax, strict, or none")
        if self.session_cookie_same_site.lower() == "none" and not self.session_cookie_secure:
            raise ValueError("SameSite=None cookies require secure transport")
        return self


settings = Settings()


def app_csrf_cookie_name(client_id: str) -> str:
    return f"{settings.csrf_cookie_name}_{client_id}"
