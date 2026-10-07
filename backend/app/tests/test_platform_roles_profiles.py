from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload
from starlette.requests import Request

from app.api.v1.endpoints.public import public_profile
from app.api.v1.endpoints.users import upload_current_user_avatar
from app.db import models  # noqa: F401
from app.db.base import Base
from app.db.models import Role, Session, User
from app.schemas.admin import RoleCreateRequest
from app.services.permission_service import PERMISSION_REGISTRY, PermissionService, role_identifier


def _request(content: bytes) -> Request:
    chunks = iter((content, b""))

    async def receive():
        try:
            chunk = next(chunks)
        except StopIteration:
            return {"type": "http.disconnect"}
        return {"type": "http.request", "body": chunk, "more_body": bool(chunk)}

    return Request(
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "POST",
            "scheme": "https",
            "path": "/api/v1/users/me/avatar",
            "raw_path": b"/api/v1/users/me/avatar",
            "query_string": b"",
            "headers": [],
            "client": ("127.0.0.1", 1234),
            "server": ("localhost", 443),
        },
        receive,
    )


@pytest.mark.asyncio
async def test_initial_roles_and_permission_sets() -> None:
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        member = await PermissionService.seed_member_role(db)
        superuser = await db.scalar(
            select(Role)
            .where(Role.key == "superuser")
            .options(selectinload(Role.permissions))
        )
        assert superuser is not None
        assert member.key == "member"
        assert member.permissions == []
        assert role_identifier(member) == "member"
        assert {permission.key for permission in superuser.permissions} == PERMISSION_REGISTRY
        assert "roles.create" in PERMISSION_REGISTRY
        superuser_user = User(
            username="new",
            display_name="New",
            is_active=True,
            roles=[superuser],
        )
        assert PermissionService.effective_permissions(superuser_user) == sorted(
            PERMISSION_REGISTRY
        )

    await engine.dispose()


def test_role_ids_and_colors_are_validated() -> None:
    role = RoleCreateRequest(key="moderator1", name="Moderator", color="#AABBCC")
    assert role.key == "moderator1"
    with pytest.raises(ValidationError):
        RoleCreateRequest(key="moderator.role", name="Moderator")
    with pytest.raises(ValidationError):
        RoleCreateRequest(key="moderator", name="Moderator", color="red")


@pytest.mark.asyncio
async def test_avatar_upload_is_validated_and_saved(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "avatar_storage_dir", tmp_path)
    monkeypatch.setattr(settings, "avatar_public_base_url", "https://api.example.test")
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        user = User(username="avatar_user", display_name="Avatar")
        db.add(user)
        await db.flush()

        result = await upload_current_user_avatar(
            _request(b"\x89PNG\r\n\x1a\navatar-bytes"),
            user,
            db,
        )
        assert result["avatar_url"].startswith("https://api.example.test/media/avatars/")
        stored_file = tmp_path / "avatars" / result["avatar_url"].rsplit("/", 1)[-1]
        assert stored_file.read_bytes() == b"\x89PNG\r\n\x1a\navatar-bytes"
        assert user.avatar_url == result["avatar_url"]

        with pytest.raises(HTTPException) as invalid:
            await upload_current_user_avatar(_request(b"<svg></svg>"), user, db)
        assert invalid.value.status_code == 415

    await engine.dispose()


@pytest.mark.asyncio
async def test_public_profile_includes_roles_and_session_presence() -> None:
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        role = Role(key="helper", name="Helper", color="#12AB34")
        user = User(username="profile_user", display_name="Profile User", roles=[role])
        db.add(user)
        await db.flush()
        now = datetime.now(UTC)
        db.add(
            Session(
                user_id=user.id,
                token_hash="hashed-token",
                last_seen_at=now,
                expires_at=now + timedelta(minutes=30),
            )
        )
        await db.commit()

        profile = await public_profile("profile_user", db)
        assert profile.is_online
        assert profile.roles[0].id == "helper"
        assert profile.roles[0].color == "#12AB34"

    await engine.dispose()
