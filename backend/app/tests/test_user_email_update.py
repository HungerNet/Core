from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from starlette.requests import Request

import app.core.deps as auth_deps
from app.db import models  # noqa: F401
from app.db.base import Base
from app.db.models import AuditEvent, User
from app.api.v1.endpoints.users import update_current_user
from app.schemas.user import UserUpdateRequest
from app.services.auth_service import AuthService


def _request(token: str) -> Request:
    return Request(
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "PATCH",
            "scheme": "https",
            "path": "/api/v1/users/me",
            "raw_path": b"/api/v1/users/me",
            "query_string": b"",
            "headers": [(b"cookie", f"hungernet_session={token}".encode("ascii"))],
            "client": ("127.0.0.1", 1234),
            "server": ("localhost", 443),
        }
    )


@pytest.mark.asyncio
async def test_account_email_update_requires_recent_session_and_is_unique(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        user = User(username="member_one", email="member@example.test", display_name="Member One")
        other = User(username="member_two", email="taken@example.test", display_name="Member Two")
        db.add_all([user, other])
        await db.flush()
        token, _ = await AuthService.issue_session(db, user=user, device_label="test")

        verify_token = auth_deps.verify_session_token

        def stale_token(value: str) -> dict | None:
            claims = verify_token(value)
            if claims:
                claims["iat"] -= 3600
            return claims

        monkeypatch.setattr(auth_deps, "verify_session_token", stale_token)
        with pytest.raises(HTTPException) as recent_auth_error:
            await update_current_user(
                _request(token),
                UserUpdateRequest(email="new@example.test"),
                user,
                db,
            )
        assert recent_auth_error.value.status_code == 403
        monkeypatch.undo()

        updated = await update_current_user(
            _request(token),
            UserUpdateRequest(email="New@Example.Test"),
            user,
            db,
        )
        assert updated.email == "new@example.test"
        events = await db.scalars(
            select(AuditEvent).where(
                AuditEvent.actor_user_id == user.id,
                AuditEvent.action == "user.email_updated",
            )
        )
        assert len(list(events)) == 1

        with pytest.raises(HTTPException) as duplicate_error:
            await update_current_user(
                _request(token),
                UserUpdateRequest(email="taken@example.test"),
                user,
                db,
            )
        assert duplicate_error.value.status_code == 409

    await engine.dispose()
