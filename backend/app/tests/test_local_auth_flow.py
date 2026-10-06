import base64
import hashlib
import hmac
import struct
import time

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from starlette.requests import Request
from starlette.responses import Response

from app.api.v1.endpoints.auth import issue_csrf_token, login, register, verify_mfa
from app.core.config import settings
from app.db import models  # noqa: F401
from app.db.base import Base
from app.schemas.auth import MfaRequest, RegisterRequest


def _totp_code(secret: str) -> str:
    key = base64.b32decode(secret + "=" * (-len(secret) % 8))
    counter = int(time.time() // 30)
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    value = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return f"{value % 1_000_000:06d}"


def _request(origin: str | None = None) -> Request:
    headers = [(b"user-agent", b"auth test")]
    if origin:
        headers.append((b"origin", origin.encode()))
    return Request(
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "POST",
            "scheme": "https",
            "path": "/api/v1/auth/login",
            "raw_path": b"/api/v1/auth/login",
            "query_string": b"",
            "headers": headers,
            "client": ("127.0.0.1", 1234),
            "server": ("localhost", 443),
        }
    )


@pytest.mark.asyncio
async def test_registration_requires_totp_and_sets_workers_cookie_attributes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "session_cookie_domain", ".hungernet.dev")
    monkeypatch.setattr(settings, "session_cookie_secure", True)
    monkeypatch.setattr(settings, "session_cookie_same_site", "lax")
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        result = await register(
            RegisterRequest(
                email="member@example.test",
                username="member_one",
                password="correct horse battery staple",
            ),
            db,
        )
        assert result["setupSecret"]
        assert result["provisioningUri"].startswith("otpauth://totp/")

        user = await db.scalar(
            __import__("sqlalchemy").select(models.User).where(models.User.username == "member_one")
        )
        assert user is not None and user.totp_secret
        payload = MfaRequest(
            identifier="member@example.test",
            password="correct horse battery staple",
            code=_totp_code(user.totp_secret),
        )
        response = Response()
        result = await verify_mfa(
            payload,
            _request("https://accounts.millered001.workers.dev"),
            response,
            db,
        )
        assert result == {"authenticated": True}
        set_cookie = response.headers["set-cookie"].lower()
        assert "hungernet_session=" in set_cookie
        assert "domain=" not in set_cookie
        assert "samesite=none" in set_cookie
        assert "; secure" in set_cookie
        assert user.totp_enabled

        login_response = Response()
        await login(payload, _request(), login_response, db)
        assert "hungernet_session=" in login_response.headers["set-cookie"]

    await engine.dispose()


@pytest.mark.asyncio
async def test_invalid_totp_does_not_activate_account() -> None:
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        await register(
            RegisterRequest(
                email="member@example.test",
                username="member_one",
                password="correct horse battery staple",
            ),
            db,
        )
        with pytest.raises(HTTPException) as error:
            await verify_mfa(
                MfaRequest(
                    identifier="member_one",
                    password="correct horse battery staple",
                    code="000000",
                ),
                _request(),
                Response(),
                db,
            )
        assert error.value.status_code == 401

    await engine.dispose()


@pytest.mark.asyncio
async def test_workers_origin_gets_cross_site_csrf_cookie(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "session_cookie_domain", ".hungernet.dev")
    monkeypatch.setattr(settings, "session_cookie_secure", True)
    monkeypatch.setattr(settings, "session_cookie_same_site", "lax")
    response = Response()

    await issue_csrf_token(_request("https://accounts.millered001.workers.dev"), response)

    set_cookie = response.headers["set-cookie"].lower()
    assert "hungernet_csrf=" in set_cookie
    assert "domain=" not in set_cookie
    assert "samesite=none" in set_cookie
    assert "; secure" in set_cookie