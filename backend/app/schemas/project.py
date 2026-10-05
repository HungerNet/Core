from __future__ import annotations

from pydantic import BaseModel, Field


class ProjectCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=160)
    slug: str = Field(..., min_length=3, max_length=120, pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$")
    body: str = Field(..., min_length=1, max_length=50000)
    status: str = Field(default="draft", pattern="^(draft|published|archived)$")


class ProjectResponse(BaseModel):
    id: str
    user_id: str
    title: str
    slug: str
    body: str
    status: str
