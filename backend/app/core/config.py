from pydantic import Field, model_validator
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    allowed_return_origins: list[str] = Field(default_factory=lambda: ["https://accounts.hungernet.dev"])
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
        if any("*" in origin for origin in self.cors_allowed_origins):
            raise ValueError("CORS_ALLOWED_ORIGINS must contain exact origins; wildcards are not supported")
        if self.environment.lower() == "production":
            required_oauth = (
                self.google_client_id and self.google_client_secret,
                self.github_client_id and self.github_client_secret,
                self.discord_client_id and self.discord_client_secret,
            )
            configured_oauth = all(
                client_id and secret and secret.get_secret_value().strip()
                for client_id, secret in (
                    (self.google_client_id, self.google_client_secret),
                    (self.github_client_id, self.github_client_secret),
                    (self.discord_client_id, self.discord_client_secret),
                )
            )
            if not configured_oauth:
                raise ValueError("Google, GitHub, and Discord OAuth credentials are required in production")
            if not self.cors_allowed_origins:
                raise ValueError("CORS_ALLOWED_ORIGINS must be configured in production")
        return self


settings = Settings()
