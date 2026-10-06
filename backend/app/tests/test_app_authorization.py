from __future__ import annotations

import base64
import hashlib
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from starlette.requests import Request

from app.api.v1.endpoints.auth import (
    AppAuthorizationRequest,
    AppTokenRequest,
    authorization_details,
    authorize_application,
    authorized_user_info,
    exchange_authorization_code,
    get_session_status,
)
from app.db import models  # noqa: F401
from app.db.base import Base
from app.db.models import User
from app.services.auth_service import AuthService


def _request(cookie: str | None = None) -> Request:
    headers = []
    if cookie:
        headers.append((b"cookie", cookie.encode("ascii")))
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
        db.add(user)
        await db.flush()
        session_token, _ = await AuthService.issue_session(db, user=user, device_label="test")
        callback = "http://localhost:4181/auth/callback"

        details = await authorization_details("hungernet", callback, "profile")
        assert details["app_name"] == "HungerNet"
        worker_callback = "https://preview.millered001.workers.dev/auth/callback"
        worker_details = await authorization_details("hungernet", worker_callback, "profile")
        assert worker_details["app_name"] == "HungerNet"
        with pytest.raises(HTTPException) as redirect_error:
            await authorization_details("hungernet", "https://attacker.example/callback", "profile")
        assert redirect_error.value.status_code == 400
        with pytest.raises(HTTPException) as worker_path_error:
            await authorization_details("hungernet", "https://preview.millered001.workers.dev/other", "profile")
        assert worker_path_error.value.status_code == 400

        verifier = "v" * 64
        state = "s" * 64
        request_payload = AppAuthorizationRequest(
            client_id="hungernet",
            redirect_uri=callback,
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

        token_result = await exchange_authorization_code(
            AppTokenRequest(
                client_id="hungernet",
                redirect_uri=callback,
                code=code,
                code_verifier=verifier,
            ),
            db,
        )
        access_token = token_result["access_token"]
        assert token_result["scope"] == "profile"
        info = await authorized_user_info(HTTPAuthorizationCredentials(scheme="Bearer", credentials=access_token), db)
        assert info == {
            "id": user.id,
            "username": "member_one",
            "display_name": "Member One",
            "avatar_url": None,
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
                    redirect_uri=callback,
                    code=code,
                    code_verifier=verifier,
                ),
                db,
            )
        assert replay_error.value.status_code == 400

    await engine.dispose()
