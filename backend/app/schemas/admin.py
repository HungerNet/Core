from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class RoleCreateRequest(BaseModel):
    key: str = Field(..., min_length=3, max_length=80)
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    permission_keys: list[str] = Field(default_factory=list, max_length=64)


class RoleResponse(BaseModel):
    id: str
    key: str
    name: str
    description: str | None = None
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
    display_name: str
    status: str
    roles: list[str] = Field(default_factory=list)


class RoleAssignmentRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=255)


class UserStatusUpdateRequest(BaseModel):
    active: bool
    reason: str = Field(min_length=3, max_length=255)
