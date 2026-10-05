from __future__ import annotations

from pydantic import BaseModel


class PublicProfileResponse(BaseModel):
    username: str
    display_name: str
    avatar_url: str | None = None
    bio: str | None = None
