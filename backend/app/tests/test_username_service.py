import re

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db import models  # noqa: F401
from app.db.base import Base
from app.db.models import User
from app.services.auth_service import AuthService
from app.services.username_service import (
    ReservedUsernameError,
    generate_username,
    resolve_edited_username,
    resolve_new_username,
    username_base,
)

PASSWORD = "cobalt river lantern! 82"


def test_username_base_normalizes_display_name() -> None:
    assert username_base("CoolPlayer") == "coolplayer"
    assert username_base("My User1") == "myuser1"
    assert username_base("✨Epic-Gamer✨") == "epic_gamer"


@pytest.mark.asyncio
async def test_signup_collision_suffix_and_reserved_base(monkeypatch: pytest.MonkeyPatch) -> None:
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    monkeypatch.setattr("app.services.username_service.secrets.randbelow", lambda _limit: 1938)
    async with session_factory() as db:
        first, _ = await AuthService.register_local_user(
            db,
            email="first@example.test",
            display_name="✨Epic-Gamer✨",
            password=PASSWORD,
        )
        second, _ = await AuthService.register_local_user(
            db,
            email="second@example.test",
            display_name="✨Epic-Gamer✨",
            password=PASSWORD,
        )

        assert first.username == "epic_gamer"
        assert second.username == "epic_gamer#1938"
        assert second.display_name == "✨Epic-Gamer✨"
        assert await db.scalar(select(User.id).where(User.username == second.username))

        with pytest.raises(ReservedUsernameError):
            await resolve_edited_username(
                db,
                "epic_gamer",
                current_username=second.username,
                user_id=second.id,
            )

        assert await resolve_edited_username(
            db,
            "renamed_user",
            current_username=second.username,
            user_id=second.id,
        ) == "renamed_user"

        long_name = "a" * 64
        db.add(User(username=long_name, display_name="Long name"))
        await db.flush()
        generated_long_name = await resolve_edited_username(
            db,
            long_name,
            current_username=second.username,
            user_id=second.id,
        )
        assert len(generated_long_name) == 69
        assert generated_long_name.startswith(f"{long_name}#")
        assert re.fullmatch(r"[a-z0-9_]+#\d{4}", second.username)

    await engine.dispose()


@pytest.mark.asyncio
async def test_signup_reserves_generated_username_base(monkeypatch: pytest.MonkeyPatch) -> None:
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    monkeypatch.setattr("app.services.username_service.secrets.randbelow", lambda _limit: 42)
    async with session_factory() as db:
        db.add(User(username="taken#0001", display_name="Taken"))
        await db.flush()
        assert await resolve_new_username(db, "taken", "Ignored") == "taken#0042"

    await engine.dispose()


@pytest.mark.asyncio
async def test_underscores_are_literal_when_checking_reserved_username_bases() -> None:
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        db.add(User(username="teamxfoo#1234", display_name="Team X Foo"))
        await db.flush()
        assert await generate_username(db, "Team_Foo") == "team_foo"

    await engine.dispose()
