from __future__ import annotations

import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.security import validate_password


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    username: str | None = Field(default=None, min_length=1, max_length=64)
    display_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=12, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", normalized):
            raise ValueError("Enter a valid email address")
        return normalized

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str | None) -> str | None:
        if value is not None and not re.fullmatch(r"[a-z0-9_]+", value):
            raise ValueError("Username must contain only lowercase letters, numbers, and underscores")
        return value

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Display name cannot be empty")
        return value

    @field_validator("password")
    @classmethod
    def validate_password_policy(cls, value: str) -> str:
        return validate_password(value)


class CredentialsRequest(BaseModel):
    identifier: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class MfaRequest(CredentialsRequest):
    code: str = Field(pattern=r"^\d{6}$")


class MfaChallengeRequest(BaseModel):
    challenge: str = Field(min_length=32, max_length=128)
    code: str = Field(pattern=r"^\d{6}$")


class MfaSetupChallengeRequest(BaseModel):
    challenge: str = Field(min_length=32, max_length=128)


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="Session token used for bearer authentication.")
    token_type: str = Field(default="bearer")
    expires_in_minutes: int = Field(default=60)


class OAuthStartResponse(BaseModel):
    provider: str
    state: str
    authorization_url: str


class OAuthCallbackResponse(BaseModel):
    provider: str
    status: str = "ok"
    user_id: str | None = None


class SessionStatusResponse(BaseModel):
    authenticated: bool = False
    user: SessionUserResponse | None = None
    expires_at: str | None = Field(default=None, serialization_alias="expiresAt")


class SessionUserResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    username: str
    display_name: str = Field(serialization_alias="displayName")
    avatar_url: str | None = Field(default=None, serialization_alias="avatarUrl")
    permissions: list[str] = Field(default_factory=list)
