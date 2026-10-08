from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.v1.endpoints.admin import (
    assign_role,
    delete_user,
    get_user,
    revoke_role,
    update_user,
    update_user_status,
)
from app.db import models  # noqa: F401
from app.db.base import Base
from app.db.models import (
    Announcement,
    AppRefreshToken,
    AuditEvent,
    Identity,
    Project,
    Role,
    Session,
    User,
)
from app.schemas.admin import AdminUserUpdateRequest, UserStatusUpdateRequest


@pytest.mark.asyncio
async def test_admin_user_details_updates_roles_status_and_deletion(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "avatar_storage_dir", tmp_path)
    avatar_dir = tmp_path / "avatars"
    avatar_dir.mkdir()
    avatar_name = "a" * 32 + ".png"
    (avatar_dir / avatar_name).write_bytes(b"avatar-data")

    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        actor = User(username="admin_user", display_name="Admin", is_superuser=True)
        role = Role(key="helper", name="Helper")
        target = User(
            username="member_user",
            email="member@example.test",
            display_name="Member",
            avatar_url=f"https://api.example.test/media/avatars/{avatar_name}",
            roles=[role],
        )
        db.add_all([actor, target])
        await db.flush()

        identity = Identity(
            user_id=target.id,
            provider="github",
            provider_subject="provider-subject",
            provider_email="member@github.test",
        )
        session = Session(
            user_id=target.id,
            token_hash="session-token-hash",
            expires_at=datetime.now(UTC) + timedelta(days=1),
            device_label="Test device",
        )
        project = Project(
            user_id=target.id,
            title="Member project",
            slug="member-project",
            body="Project body",
        )
        db.add_all([identity, session, project])
        await db.flush()
        announcement = Announcement(
            title="Project update",
            body="Announcement body",
            project_slug=project.slug,
            created_by=target.id,
        )
        refresh = AppRefreshToken(
            session_id=session.id,
            user_id=target.id,
            client_id="hungernet",
            token_hash="refresh-token-hash",
            expires_at=datetime.now(UTC) + timedelta(days=1),
        )
        db.add_all([announcement, refresh])
        await db.commit()

        detail = await get_user(target.id, actor, db)
        assert detail.id == target.id
        assert detail.identities[0].provider_subject == "provider-subject"
        assert detail.sessions[0].device_label == "Test device"
        assert detail.storage.avatar_exists
        assert detail.storage.avatar_bytes == len(b"avatar-data")
        assert "session-token-hash" not in detail.model_dump_json()

        updated = await update_user(
            target.id,
            AdminUserUpdateRequest(
                username="Updated_Member",
                email=None,
                display_name="Updated Member",
                profile_visibility="private",
            ),
            actor,
            db,
        )
        assert updated.username == "updated_member"
        assert updated.email is None
        assert updated.profile_visibility == "private"

        moderator = Role(key="moderator", name="Moderator")
        db.add(moderator)
        await db.flush()
        await assign_role(target.id, moderator.id, None, actor, db)
        await revoke_role(target.id, moderator.id, None, actor, db)

        status_result = await update_user_status(
            target.id,
            UserStatusUpdateRequest(active=False),
            actor,
            db,
        )
        assert status_result.status == "disabled"

        await delete_user(target.id, actor, db)
        assert await db.get(User, target.id) is None
        assert await db.scalar(select(Session.id).where(Session.user_id == target.id)) is None
        assert await db.scalar(select(Project.id).where(Project.user_id == target.id)) is None
        assert (
            await db.scalar(select(AppRefreshToken.id).where(AppRefreshToken.user_id == target.id))
            is None
        )
        assert (
            await db.scalar(
                select(Announcement.project_slug).where(Announcement.id == announcement.id)
            )
            is None
        )
        assert (
            await db.scalar(
                select(AuditEvent.id).where(
                    AuditEvent.action == "user.deleted",
                    AuditEvent.target_id == target.id,
                )
            )
            is not None
        )
        assert not (avatar_dir / avatar_name).exists()

    await engine.dispose()
