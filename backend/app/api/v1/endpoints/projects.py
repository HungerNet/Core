from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_current_user_id, get_db, require_csrf, require_permission
from app.db.models import AuditEvent, Project, User
from app.schemas.project import ProjectCreateRequest, ProjectResponse
from app.services.permission_service import PermissionService
from app.services.project_service import ProjectConflict, ProjectService

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


@router.get("/mine", response_model=list[ProjectResponse])
async def list_my_projects(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[ProjectResponse]:
    projects = await db.scalars(
        select(Project).where(Project.user_id == user_id).order_by(Project.updated_at.desc())
    )
    return [ProjectResponse.model_validate(item, from_attributes=True) for item in projects]


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_csrf), Depends(require_permission("platform.projects.create"))],
)
async def create_project(
    payload: ProjectCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    if payload.status != "draft" and not PermissionService.has_permission(user, "platform.projects.manage"):
        raise HTTPException(status_code=403, detail="Only project managers can publish projects")
    try:
        project = await ProjectService.create_project(
            db,
            user_id=user.id,
            title=payload.title,
            slug=payload.slug,
            body=payload.body,
            status=payload.status,
        )
    except ProjectConflict as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    db.add(
        AuditEvent(
            actor_user_id=user.id,
            action="project.created",
            target_type="project",
            target_id=project.id,
            details=f"Created project {project.slug}",
        )
    )
    try:
        await db.commit()
    except IntegrityError as error:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A project with this slug already exists") from error
    await db.refresh(project)
    return ProjectResponse.model_validate(project, from_attributes=True)


@router.get("/{slug}", response_model=ProjectResponse)
async def get_project(slug: str, db: AsyncSession = Depends(get_db)) -> ProjectResponse:
    project = await db.scalar(select(Project).where(Project.slug == slug, Project.status == "published"))
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse.model_validate(project, from_attributes=True)
