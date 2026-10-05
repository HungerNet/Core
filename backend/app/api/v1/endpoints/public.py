from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.db.models import User
from app.schemas.public import PublicProfileResponse

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/users/{username}", response_model=PublicProfileResponse)
async def public_profile(username: str, db: AsyncSession = Depends(get_db)) -> PublicProfileResponse:
    user = await db.scalar(select(User).where(func.lower(User.username) == username.lower()))
    if user is None or not user.is_active or user.profile_visibility != "public":
        raise HTTPException(status_code=404, detail="Profile not found")
    return PublicProfileResponse(
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
    )
