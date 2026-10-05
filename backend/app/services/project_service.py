from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Project


class ProjectConflict(Exception):
    pass


class ProjectService:
    @staticmethod
    async def create_project(
        db: AsyncSession,
        *,
        user_id: str,
        title: str,
        slug: str,
        body: str,
        status: str = "draft",
    ) -> Project:
        exists = await db.scalar(select(Project.id).where(Project.slug == slug))
        if exists:
            raise ProjectConflict("A project with this slug already exists")
        project = Project(user_id=user_id, title=title.strip(), slug=slug, body=body, status=status)
        db.add(project)
        await db.flush()
        return project
