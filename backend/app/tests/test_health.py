import asyncio

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from starlette.requests import Request

from app.api.v1.endpoints.auth import oauth_start
from app.main import app

client = TestClient(app)


def test_live_health() -> None:
    response = client.get("/api/v1/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_unknown_oauth_provider_returns_not_found() -> None:
    path = "/api/v1/auth/oauth/unknown/start"
    request = Request(
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "GET",
            "scheme": "https",
            "path": path,
            "raw_path": path.encode(),
            "query_string": b"",
            "headers": [],
            "client": ("127.0.0.1", 1234),
            "server": ("localhost", 443),
        }
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(oauth_start("unknown", request, None, None))

    assert error.value.status_code == 404
