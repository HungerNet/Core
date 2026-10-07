from __future__ import annotations

from pydantic import BaseModel, Field


class PublicRoleResponse(BaseModel):
    id: str
    name: str
    color: str


class PublicProfileResponse(BaseModel):
    id: str
    username: str
    display_name: str
    avatar_url: str | None = None
    bio: str | None = None
    is_online: bool = False
    roles: list[PublicRoleResponse] = Field(default_factory=list)
