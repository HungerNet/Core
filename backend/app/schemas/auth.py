from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


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
