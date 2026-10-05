from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class AnnouncementResponse(BaseModel):
    id: str
    title: str
    body: str
    published_at: datetime | None = None
    project_slug: str | None = None


class AnnouncementCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=50000)
    project_slug: str | None = Field(default=None, min_length=3, max_length=120)
    status: str = Field(default="draft", pattern="^(draft|published)$")