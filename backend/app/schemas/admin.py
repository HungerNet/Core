from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RoleCreateRequest(BaseModel):
    key: str = Field(..., min_length=1, max_length=80, pattern="^[a-z0-9]+$")
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    color: str = Field(default="#7ef9d2", pattern="^#[0-9a-fA-F]{6}$")
    permission_keys: list[str] = Field(default_factory=list, max_length=64)


class RoleUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    color: str | None = Field(default=None, pattern="^#[0-9a-fA-F]{6}$")
    permission_keys: list[str] | None = Field(default=None, max_length=64)


class RoleResponse(BaseModel):
    id: str
    key: str
    name: str
    description: str | None = None
    color: str = "#7ef9d2"
    is_system: bool = False
    permissions: list[str] = Field(default_factory=list)


class AuditEventResponse(BaseModel):
    id: str
    actor_user_id: str | None = None
    action: str
    target_type: str
    target_id: str
    details: str | None = None
    created_at: datetime


class AdminUserResponse(BaseModel):
    id: str
    username: str
    email: str | None = None
    display_name: str
    status: str
    roles: list[str] = Field(default_factory=list)


class AdminUserIdentityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    provider: str
    provider_subject: str
    provider_email: str | None = None
    avatar_url: str | None = None
    created_at: datetime
    last_login_at: datetime | None = None


class AdminUserSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    device_label: str | None = None
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime
    revoked_at: datetime | None = None


class AdminUserStorageResponse(BaseModel):
    avatar_filename: str | None = None
    avatar_exists: bool = False
    avatar_bytes: int = 0


class AdminUserDetailResponse(AdminUserResponse):
    email: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    profile_visibility: str
    is_superuser: bool
    totp_enabled: bool
    created_at: datetime
    updated_at: datetime
    identities: list[AdminUserIdentityResponse] = Field(default_factory=list)
    sessions: list[AdminUserSessionResponse] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    project_count: int = 0
    storage: AdminUserStorageResponse = Field(default_factory=AdminUserStorageResponse)


class AdminUserUpdateRequest(BaseModel):
    username: str | None = Field(default=None, min_length=1, max_length=64)
    email: str | None = Field(default=None, max_length=254)
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=500)
    bio: str | None = Field(default=None, max_length=500)
    profile_visibility: str | None = Field(default=None, pattern="^(public|private)$")
    is_superuser: bool | None = None
    totp_enabled: bool | None = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str | None) -> str:
        if value is None or not re.fullmatch(r"[a-z0-9_]+", value):
            raise ValueError(
                "Username must contain only lowercase letters, numbers, and underscores"
            )
        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized and not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", normalized):
            raise ValueError("Enter a valid email address")
        return normalized or None

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value: str | None) -> str:
        if value is None or not value.strip():
            raise ValueError("Display name cannot be empty")
        return value


class RoleAssignmentRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=255)


class UserStatusUpdateRequest(BaseModel):
    active: bool
    reason: str | None = Field(default=None, max_length=255)
