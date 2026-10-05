from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_csrf, require_permission
from app.db.models import Announcement, AuditEvent, User
from app.schemas.announcement import AnnouncementCreateRequest, AnnouncementResponse

router = APIRouter(prefix="/announcements", tags=["announcements"])


@router.get("", response_model=list[AnnouncementResponse])
async def list_announcements(
    project_slug: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[AnnouncementResponse]:
    query = select(Announcement).where(
        Announcement.status == "published",
        Announcement.published_at.is_not(None),
    )
    if project_slug:
        query = query.where(Announcement.project_slug == project_slug)
    records = await db.scalars(query.order_by(Announcement.published_at.desc()).limit(limit))
    return [AnnouncementResponse.model_validate(item, from_attributes=True) for item in records]


@router.post(
    "",
    response_model=AnnouncementResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_csrf), Depends(require_permission("platform.announcements.manage"))],
)
async def create_announcement(
    payload: AnnouncementCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AnnouncementResponse:
    now = datetime.now(UTC)
    announcement = Announcement(
        title=payload.title.strip(),
        body=payload.body,
        project_slug=payload.project_slug,
        status=payload.status,
        created_by=user.id,
        published_at=now if payload.status == "published" else None,
    )
    db.add(announcement)
    await db.flush()
    db.add(
        AuditEvent(
            actor_user_id=user.id,
            action="announcement.created",
            target_type="announcement",
            target_id=announcement.id,
            details=f"Created announcement {announcement.title}",
        )
    )
    await db.commit()
    await db.refresh(announcement)
    return AnnouncementResponse.model_validate(announcement, from_attributes=True)