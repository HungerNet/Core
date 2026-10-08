from __future__ import annotations

import re
import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User

USERNAME_PATTERN = re.compile(r"^[a-z0-9_]+$")
GENERATED_USERNAME_PATTERN = re.compile(r"^([a-z0-9_]+)#\d{4}$")


class ReservedUsernameError(ValueError):
    pass


def username_base(display_name: str) -> str:
    normalized = display_name.lower().replace("-", "_")
    base = re.sub(r"[^a-z0-9_]", "", normalized)[:59]
    return base or "user"


async def _username_exists(
    db: AsyncSession,
    username: str,
    *,
    exclude_user_id: str | None = None,
) -> bool:
    query = select(User.id).where(User.username == username)
    if exclude_user_id is not None:
        query = query.where(User.id != exclude_user_id)
    return await db.scalar(query) is not None


async def generate_username(db: AsyncSession, display_name: str) -> str:
    base = username_base(display_name)
    if not await _username_exists(db, base):
        return base

    for _ in range(10000):
        username = f"{base}#{secrets.randbelow(10000):04d}"
        if not await _username_exists(db, username):
            return username
    raise ValueError("Could not generate a unique username")


async def resolve_edited_username(
    db: AsyncSession,
    requested_username: str,
    *,
    current_username: str,
    user_id: str,
) -> str:
    if not USERNAME_PATTERN.fullmatch(requested_username):
        raise ValueError("Username must contain only lowercase letters, numbers, and underscores")

    generated_match = GENERATED_USERNAME_PATTERN.fullmatch(current_username)
    if generated_match and requested_username == generated_match.group(1):
        raise ReservedUsernameError("The base of your generated username is reserved")

    if not await _username_exists(db, requested_username, exclude_user_id=user_id):
        return requested_username

    for _ in range(10000):
        username = f"{requested_username}#{secrets.randbelow(10000):04d}"
        if not await _username_exists(db, username, exclude_user_id=user_id):
            return username
    raise ValueError("Could not generate a unique username")