from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_db
from app.db.models import Session, User
from app.schemas.public import PublicProfileResponse, PublicRoleResponse
from app.services.permission_service import role_identifier

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/users/{username}", response_model=PublicProfileResponse)
async def public_profile(username: str, db: AsyncSession = Depends(get_db)) -> PublicProfileResponse:
    user = await db.scalar(
        select(User)
        .where(func.lower(User.username) == username.lower())
        .options(selectinload(User.roles))
    )
    if user is None or not user.is_active or user.profile_visibility != "public":
        raise HTTPException(status_code=404, detail="Profile not found")
    now = datetime.now(UTC)
    sessions = await db.execute(
        select(Session.last_seen_at, Session.expires_at).where(
            Session.user_id == user.id,
            Session.revoked_at.is_(None),
        )
    )
    is_online = False
    for last_seen_at, expires_at in sessions:
        if last_seen_at.tzinfo is None:
            last_seen_at = last_seen_at.replace(tzinfo=UTC)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if expires_at > now and last_seen_at >= now - timedelta(minutes=5):
            is_online = True
            break
    return PublicProfileResponse(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        is_online=is_online,
        roles=[
            PublicRoleResponse(id=role_identifier(role), name=role.name, color=role.color)
            for role in user.roles
        ],
    )
