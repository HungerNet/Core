from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.db.models import Project
from app.schemas.project import ProjectResponse

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[ProjectResponse]:
    projects = await db.scalars(
        select(Project)
        .where(Project.status == "published")
        .order_by(Project.updated_at.desc())
        .limit(limit)
    )
    return [ProjectResponse.model_validate(item, from_attributes=True) for item in projects]


@router.get("/{slug}", response_model=ProjectResponse)
async def get_project(slug: str, db: AsyncSession = Depends(get_db)) -> ProjectResponse:
    project = await db.scalar(
        select(Project).where(Project.slug == slug, Project.status == "published")
    )
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse.model_validate(project, from_attributes=True)
