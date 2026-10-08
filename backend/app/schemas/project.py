from __future__ import annotations

from pydantic import BaseModel


class ProjectResponse(BaseModel):
    id: str
    user_id: str
    title: str
    slug: str
    body: str
    status: str
