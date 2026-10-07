from __future__ import annotations

import base64
import hashlib
from datetime import UTC, datetime, timedelta
from http.cookies import SimpleCookie
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi import HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from starlette.requests import Request

from app.api.v1.endpoints.auth import (
    AppAuthorizationRequest,
    AppRefreshRequest,
    AppTokenRequest,
    authorization_details,
    authorize_application,
    authorized_user_info,
    exchange_authorization_code,
    get_session_status,
    issue_csrf_token,
    refresh_application_token,
)
from app.core.deps import get_current_user_id
from app.core.security import hash_token
from app.db import models  # noqa: F401
from app.db.base import Base
from app.db.models import AppRefreshToken, Permission, Role, User
from app.services.auth_service import AuthService


def _request(
    cookie: str | None = None,
    *,
    origin: str | None = None,
    csrf_header: str | None = None,
) -> Request:
    headers = []
    if cookie:
        headers.append((b"cookie", cookie.encode("ascii")))
    if origin:
        headers.append((b"origin", origin.encode("ascii")))
    if csrf_header:
        headers.append((b"x-csrf-token", csrf_header.encode("ascii")))
    return Request(
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "POST",
            "scheme": "https",
            "path": "/api/v1/auth/authorize",
            "raw_path": b"/api/v1/auth/authorize",
            "query_string": b"",
            "headers": headers,
            "client": ("127.0.0.1", 1234),
            "server": ("localhost", 443),
        }
    )


def _challenge(verifier: str) -> str:
    encoded = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode("ascii")).digest())
    return encoded.rstrip(b"=").decode("ascii")


@pytest.mark.asyncio
async def test_registered_app_authorization_uses_pkce_and_profile_scope() -> None:
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        user = User(username="member_one", email="member@example.test", display_name="Member One")
        admin_permission = Permission(
            key="platform.admin.users.read",
            description="Read platform admin users",
        )
        admin_role = Role(
            key="platform.admin",
            name="Platform Admin",
            is_system=True,
            permissions=[admin_permission],
        )
        user.roles.append(admin_role)
        db.add(user)
        await db.flush()
        session_token, issued_session = await AuthService.issue_session(
            db,
            user=user,
            device_label="test",
        )
        assert issued_session.expires_at > datetime.now(UTC) + timedelta(days=29)
        callback = "http://localhost:4181/auth/callback"

        details = await authorization_details("hungernet", callback, "profile")
        assert details["app_name"] == "HungerNet"
        worker_callback = "https://hungernet.millered001.workers.dev/auth/callback"
        worker_details = await authorization_details("hungernet", worker_callback, "profile")
        assert worker_details["app_name"] == "HungerNet"
        external_csrf_response = Response()
        await issue_csrf_token(
            _request(origin="https://ifamished.com"),
            external_csrf_response,
            "ifamished",
        )
        external_csrf_cookie = SimpleCookie()
        external_csrf_cookie.load(external_csrf_response.headers["set-cookie"])
        assert not external_csrf_cookie["hungernet_csrf_ifamished"]["domain"]
        with pytest.raises(HTTPException) as redirect_error:
            await authorization_details("hungernet", "https://attacker.example/callback", "profile")
        assert redirect_error.value.status_code == 400
        with pytest.raises(HTTPException) as worker_path_error:
            await authorization_details("hungernet", "https://hungernet.millered001.workers.dev/other", "profile")
        assert worker_path_error.value.status_code == 400

        verifier = "v" * 64
        state = "s" * 64
        request_payload = AppAuthorizationRequest(
            client_id="hungernet",
            redirect_uri=worker_callback,
            state=state,
            code_challenge=_challenge(verifier),
        )
        approved = await authorize_application(
            request_payload,
            _request(f"hungernet_session={session_token}"),
            user.id,
            db,
        )
        query = parse_qs(urlsplit(approved["redirect_to"]).query)
        code = query["code"][0]
        assert query["state"] == [state]

        with pytest.raises(HTTPException) as verifier_error:
            await exchange_authorization_code(
                AppTokenRequest(
                    client_id="hungernet",
                    redirect_uri=callback,
                    code=code,
                    code_verifier="x" * 64,
                ),
                db,
            )
        assert verifier_error.value.status_code == 400

        worker_origin = "https://hungernet.millered001.workers.dev"
        with pytest.raises(HTTPException) as origin_error:
            await exchange_authorization_code(
                AppTokenRequest(
                    client_id="hungernet",
                    redirect_uri=worker_callback,
                    code=code,
                    code_verifier=verifier,
                ),
                db,
                request=_request(origin="https://ifamished.com"),
                response=Response(),
            )
        assert origin_error.value.status_code == 403

        exchange_response = Response()
        token_result = await exchange_authorization_code(
            AppTokenRequest(
                client_id="hungernet",
                redirect_uri=worker_callback,
                code=code,
                code_verifier=verifier,
            ),
            db,
            request=_request(origin=worker_origin),
            response=exchange_response,
        )
        issued_cookies = SimpleCookie()
        issued_cookies.load(exchange_response.headers["set-cookie"])
        refresh_cookie_name = "hungernet_refresh_hungernet"
        refresh_token = issued_cookies[refresh_cookie_name].value
        assert issued_cookies[refresh_cookie_name]["httponly"]
        assert issued_cookies[refresh_cookie_name]["samesite"].lower() == "none"
        assert not issued_cookies[refresh_cookie_name]["domain"]

        refresh_payload = AppRefreshRequest(client_id="hungernet")
        with pytest.raises(HTTPException) as csrf_error:
            await refresh_application_token(
                refresh_payload,
                _request(
                    f"{refresh_cookie_name}={refresh_token}",
                    origin=worker_origin,
                ),
                Response(),
                db,
            )
        assert csrf_error.value.status_code == 403

        csrf_token = "test-csrf-token"
        refresh_response = Response()
        refreshed = await refresh_application_token(
            refresh_payload,
            _request(
                f"{refresh_cookie_name}={refresh_token}; hungernet_csrf_hungernet={csrf_token}",
                origin=worker_origin,
                csrf_header=csrf_token,
            ),
            refresh_response,
            db,
        )
        rotated_cookies = SimpleCookie()
        rotated_cookies.load(refresh_response.headers["set-cookie"])
        rotated_token = rotated_cookies[refresh_cookie_name].value
        assert rotated_token != refresh_token
        assert refreshed["expires_in"] == token_result["expires_in"]

        concurrent_response = Response()
        concurrent_refresh = await refresh_application_token(
            refresh_payload,
            _request(
                f"{refresh_cookie_name}={refresh_token}; hungernet_csrf_hungernet={csrf_token}",
                origin=worker_origin,
                csrf_header=csrf_token,
            ),
            concurrent_response,
            db,
        )
        assert concurrent_refresh["scope"] == "profile"
        assert "set-cookie" not in concurrent_response.headers

        access_token = token_result["access_token"]
        assert token_result["scope"] == "profile"
        assert await get_current_user_id(
            _request(),
            HTTPAuthorizationCredentials(scheme="Bearer", credentials=access_token),
            db,
        ) == user.id
        info = await authorized_user_info(HTTPAuthorizationCredentials(scheme="Bearer", credentials=access_token), db)
        assert info == {
            "id": user.id,
            "username": "member_one",
            "display_name": "Member One",
            "avatar_url": None,
            "permissions": ["platform.admin.users.read"],
        }
        session = await get_session_status(
            _request(),
            HTTPAuthorizationCredentials(scheme="Bearer", credentials=access_token),
            db,
        )
        assert session.authenticated is False

        with pytest.raises(HTTPException) as replay_error:
            await exchange_authorization_code(
                AppTokenRequest(
                    client_id="hungernet",
                    redirect_uri=worker_callback,
                    code=code,
                    code_verifier=verifier,
                ),
                db,
            )
        assert replay_error.value.status_code == 400

        spent_refresh = await db.scalar(
            select(AppRefreshToken).where(AppRefreshToken.token_hash == hash_token(refresh_token))
        )
        assert spent_refresh is not None
        spent_refresh.revoked_at = datetime.now(UTC) - timedelta(seconds=30)
        await db.commit()
        with pytest.raises(HTTPException) as rotated_token_error:
            await refresh_application_token(
                refresh_payload,
                _request(
                    f"{refresh_cookie_name}={refresh_token}; hungernet_csrf_hungernet={csrf_token}",
                    origin=worker_origin,
                    csrf_header=csrf_token,
                ),
                Response(),
                db,
            )
        assert rotated_token_error.value.status_code == 401
        with pytest.raises(HTTPException) as revoked_access_error:
            await get_current_user_id(
                _request(),
                HTTPAuthorizationCredentials(
                    scheme="Bearer",
                    credentials=refreshed["access_token"],
                ),
                db,
            )
        assert revoked_access_error.value.status_code == 401

    await engine.dispose()
