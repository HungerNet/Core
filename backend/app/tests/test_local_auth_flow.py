import base64
import hashlib
import hmac
import struct
import time
from datetime import timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from starlette.requests import Request
from starlette.responses import Response

from app.api.v1.endpoints.auth import (
    _mfa_challenge_return_url,
    get_session_status,
    issue_csrf_token,
    login,
    register,
    setup_mfa,
    verify_mfa,
)
from app.api.v1.endpoints.users import disable_current_user_mfa
from app.core.config import settings
from app.core.security import decrypt_totp_secret
from app.db import models  # noqa: F401
from app.db.base import Base
from app.db.models import Role, User, UserRole
from app.schemas.auth import CredentialsRequest, MfaRequest, RegisterRequest
from app.schemas.user import MfaDisableRequest
from app.services.permission_service import PermissionService

PASSWORD = "cobalt river lantern! 82"


def _totp_code(secret: str) -> str:
    key = base64.b32decode(secret + "=" * (-len(secret) % 8))
    counter = int(time.time() // 30)
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    value = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return f"{value % 1_000_000:06d}"


def _request(
    origin: str | None = None,
    *,
    cookie: str | None = None,
    method: str = "POST",
) -> Request:
    headers = [(b"user-agent", b"auth test")]
    if origin:
        headers.append((b"origin", origin.encode()))
    if cookie:
        headers.append((b"cookie", cookie.encode()))
    path = "/api/v1/auth/session" if method == "GET" else "/api/v1/auth/login"
    return Request(
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": method,
            "scheme": "https",
            "path": path,
            "raw_path": path.encode(),
            "query_string": b"",
            "headers": headers,
            "client": ("127.0.0.1", 1234),
            "server": ("localhost", 443),
        }
    )


def test_mfa_setup_return_url_replaces_untrusted_challenge_parameters() -> None:
    return_to = "https://account.hungernet.dev/profile?tab=security&mfa_setup=0&mfa_challenge=bad#top"

    challenge_url = _mfa_challenge_return_url(
        return_to,
        "new-challenge",
        setup_required=True,
    )

    assert challenge_url == (
        "https://account.hungernet.dev/profile?tab=security"
        "&mfa_challenge=new-challenge&mfa_setup=1#top"
    )


async def _database():
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    return engine, async_sessionmaker(engine, expire_on_commit=False)


@pytest.mark.asyncio
async def test_optional_mfa_enrollment_and_sequential_login(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "session_cookie_secure", True)
    monkeypatch.setattr(settings, "session_cookie_same_site", "lax")
    engine, session_factory = await _database()
    origin = "https://account.millered001.workers.dev"

    async with session_factory() as db:
        created = await register(
            RegisterRequest(
                email="member@example.test",
                username="member_one",
                display_name="Member One",
                password=PASSWORD,
            ),
            db=db,
            request=_request(origin),
            response=Response(),
        )
        assert created["authenticated"]
        user = await db.scalar(select(User).where(User.username == "member_one"))
        assert user is not None and user.totp_secret is None
        assert user.display_name == "Member One"

        credentials = CredentialsRequest(identifier="member@example.test", password=PASSWORD)
        setup = await setup_mfa(credentials, _request(origin), db)
        secret = setup["setupSecret"]
        repeated_setup = await setup_mfa(credentials, _request(origin), db)
        assert repeated_setup["setupSecret"] == secret
        assert setup["provisioningUri"].startswith("otpauth://totp/")
        assert user.totp_secret is not None and user.totp_secret != secret
        assert decrypt_totp_secret(user.totp_secret) == secret

        with pytest.raises(HTTPException) as invalid:
            await verify_mfa(
                MfaRequest(identifier=credentials.identifier, password=PASSWORD, code="000000"),
                _request(origin),
                Response(),
                db,
            )
        assert invalid.value.status_code == 401
        assert not user.totp_enabled

        result = await verify_mfa(
            MfaRequest(
                identifier=credentials.identifier,
                password=PASSWORD,
                code=_totp_code(secret),
            ),
            _request(origin),
            Response(),
            db,
        )
        assert result == {"authenticated": True}
        assert user.totp_enabled

        login_response = Response()
        first_step = await login(credentials, _request(origin), login_response, db)
        assert first_step == {"authenticated": False, "mfaRequired": True}
        assert "hungernet_session=" not in login_response.headers.get("set-cookie", "")

        response = Response()
        await verify_mfa(
            MfaRequest(
                identifier=credentials.identifier,
                password=PASSWORD,
                code=_totp_code(secret),
            ),
            _request(origin),
            response,
            db,
        )
        session_cookie = response.headers["set-cookie"].split(";", 1)[0]
        session = await get_session_status(
            _request(origin, cookie=session_cookie, method="GET"),
            None,
            db,
        )
        assert session.authenticated and session.user is not None
        assert session.user.username == "member_one"
        db_session = await db.scalar(select(models.Session).where(models.Session.user_id == user.id))
        assert db_session is not None
        assert db_session.expires_at - db_session.created_at > timedelta(days=89)

    await engine.dispose()


@pytest.mark.asyncio
async def test_optional_mfa_can_be_disabled_with_password_and_current_code() -> None:
    engine, session_factory = await _database()
    async with session_factory() as db:
        await register(
            RegisterRequest(
                email="mfa-disable@example.test",
                username="mfa_disable",
                display_name="MFA Disable",
                password=PASSWORD,
            ),
            db=db,
            request=_request(),
            response=Response(),
        )
        user = await db.scalar(select(User).where(User.username == "mfa_disable"))
        assert user is not None
        credentials = CredentialsRequest(identifier=user.username, password=PASSWORD)
        setup = await setup_mfa(credentials, _request(), db)
        await verify_mfa(
            MfaRequest(
                identifier=user.username,
                password=PASSWORD,
                code=_totp_code(setup["setupSecret"]),
            ),
            _request(),
            Response(),
            db,
        )

        await disable_current_user_mfa(
            MfaDisableRequest(
                current_password=PASSWORD,
                code=_totp_code(setup["setupSecret"]),
            ),
            user,
            db,
        )

        assert not user.totp_enabled
        assert user.totp_secret is None
        assert user.totp_secret_hash is None
    await engine.dispose()


@pytest.mark.asyncio
async def test_required_role_prompts_for_mfa_enrollment() -> None:
    engine, session_factory = await _database()
    async with session_factory() as db:
        await register(
            RegisterRequest(
                email="required@example.test",
                username="required_user",
                display_name="Required User",
                password=PASSWORD,
            ),
            db=db,
            request=_request(),
            response=Response(),
        )
        user = await db.scalar(select(User).where(User.username == "required_user"))
        assert user is not None
        await PermissionService.seed_member_role(db)
        role = Role(key="protected", name="Protected", requires_mfa=True)
        db.add(role)
        await db.flush()
        db.add(UserRole(user_id=user.id, role_id=role.id))
        await db.commit()

        result = await login(
            CredentialsRequest(identifier="required_user", password=PASSWORD),
            _request(),
            Response(),
            db,
        )
        assert result == {"authenticated": False, "mfaSetupRequired": True}

    await engine.dispose()


@pytest.mark.asyncio
async def test_inactive_accounts_cannot_login_or_start_mfa_setup() -> None:
    engine, session_factory = await _database()
    async with session_factory() as db:
        await register(
            RegisterRequest(
                email="inactive@example.test",
                username="inactive",
                display_name="Inactive User",
                password=PASSWORD,
            ),
            db=db,
            request=_request(),
            response=Response(),
        )
        user = await db.scalar(select(User).where(User.username == "inactive"))
        assert user is not None
        user.is_active = False
        await db.commit()
        credentials = CredentialsRequest(identifier="inactive", password=PASSWORD)

        with pytest.raises(HTTPException) as login_error:
            await login(credentials, _request(), Response(), db)
        assert login_error.value.status_code == 401
        with pytest.raises(HTTPException) as setup_error:
            await setup_mfa(credentials, _request(), db)
        assert setup_error.value.status_code == 401

    await engine.dispose()


@pytest.mark.asyncio
async def test_workers_origin_gets_cross_site_csrf_cookie(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "session_cookie_secure", True)
    monkeypatch.setattr(settings, "session_cookie_same_site", "lax")
    response = Response()

    await issue_csrf_token(_request("https://account.millered001.workers.dev"), response)

    set_cookie = response.headers["set-cookie"].lower()
    assert "hungernet_csrf=" in set_cookie
    assert "domain=" not in set_cookie
    assert "samesite=none" in set_cookie
    assert "; secure" in set_cookie
