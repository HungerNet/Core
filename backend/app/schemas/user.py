from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class PublicUserResponse(BaseModel):
    id: str
    username: str
    display_name: str
    avatar_url: str | None = None
    profile_visibility: str = "public"


class UserMeResponse(BaseModel):
    id: str
    username: str
    email: str | None = None
    display_name: str
    avatar_url: str | None = None
    bio: str | None = None
    profile_visibility: str = "public"
    is_active: bool = True
    is_superuser: bool = False


class UserUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    username: str | None = Field(default=None, min_length=3, max_length=64)
    email: str | None = Field(default=None, max_length=254)
    bio: str | None = Field(default=None, max_length=500)
    profile_visibility: str | None = Field(default=None, pattern="^(public|private)$")

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value: str | None) -> str:
        if value is None or not value.strip():
            raise ValueError("Display name cannot be empty")
        return value.strip()

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str | None) -> str:
        normalized = value.strip().lower() if value else ""
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{2,63}", normalized):
            raise ValueError("Username must be 3-64 letters, numbers, hyphens, or underscores")
        return normalized

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str:
        normalized = value.strip().lower() if value else ""
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", normalized):
            raise ValueError("Enter a valid email address")
        return normalized

    @field_validator("profile_visibility")
    @classmethod
    def validate_profile_visibility(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Profile visibility cannot be null")
        return value


class LinkedIdentityResponse(BaseModel):
    provider: str
    linked_at: datetime
    provider_email: str | None = None


class SessionDeviceResponse(BaseModel):
    id: str
    device_label: str | None = None
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime
    current: bool
