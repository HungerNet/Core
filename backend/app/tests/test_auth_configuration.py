from pathlib import Path

import pytest

from app.core.config import (
    CORS_ORIGINS,
    RETURN_ORIGINS,
    WORKERS_DEV_ACCOUNT_ORIGIN,
    Settings,
    is_allowed_origin,
)
from app.core.security import (
    hash_password,
    new_totp_secret,
    validate_password,
    verify_password,
    verify_totp,
)


def test_settings_enforce_production_security_defaults() -> None:
    configured = Settings(
        _env_file=None,
        jwt_secret="production-secret-that-is-long-enough-123456",
    )

    assert configured.session_cookie_secure is True
    assert configured.session_cookie_same_site == "lax"
    with pytest.raises(ValueError, match="JWT_SECRET"):
        Settings(_env_file=None, jwt_secret="")
    with pytest.raises(ValueError, match="SESSION_COOKIE_SECURE"):
        Settings(
            _env_file=None,
            jwt_secret="production-secret-that-is-long-enough-123456",
            session_cookie_secure=False,
        )


def test_environment_example_loads_superuser_values() -> None:
    env_example = Path(__file__).resolve().parents[3] / ".env.example"
    configured = Settings(
        _env_file=env_example,
        jwt_secret="production-secret-that-is-long-enough-123456",
    )

    assert configured.superuser_id == "hungernet"
    assert configured.superuser_username == "HungerNet"
    assert configured.superuser_password is not None
    assert configured.superuser_password.get_secret_value() == "HungerAdmin#8456123"


@pytest.mark.parametrize(
    ("origin", "expected"),
    [
        ("https://account.millered001.workers.dev", True),
        ("https://admin.millered001.workers.dev", True),
        ("https://preview.millered001.workers.dev", False),
        ("https://nested.preview.millered001.workers.dev", False),
        ("http://preview.millered001.workers.dev", False),
        ("https://millered001.workers.dev", False),
        ("https://preview.millered001.workers.dev.attacker.test", False),
        ("https://preview.millered001.workers.dev:8443", False),
    ],
)
def test_origins_must_match_hardcoded_allowlist(origin: str, expected: bool) -> None:
    assert is_allowed_origin(origin, CORS_ORIGINS) is expected


def test_all_normal_and_workers_hosts_are_hardcoded() -> None:
    assert WORKERS_DEV_ACCOUNT_ORIGIN in CORS_ORIGINS
    assert set(RETURN_ORIGINS) == set(CORS_ORIGINS)
    assert "https://admin.hungernet.dev" in RETURN_ORIGINS
    assert "https://admin.millered001.workers.dev" in RETURN_ORIGINS


def test_account_workers_origin_passes_cors_preflight() -> None:
    from fastapi.testclient import TestClient

    from app.main import app

    origin = "https://account.millered001.workers.dev"
    response = TestClient(app).options(
        "/api/v1/auth/session",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin


def test_password_hash_and_totp_validation() -> None:
    password = "cobalt river lantern! 82"
    encoded = hash_password(password)
    assert verify_password(password, encoded)
    assert not verify_password("incorrect", encoded)
    assert validate_password(password) == password
    with pytest.raises(ValueError, match="12 characters"):
        validate_password("short!")
    with pytest.raises(ValueError, match="symbol"):
        validate_password("manycharacters")
    with pytest.raises(ValueError, match="common"):
        validate_password("CorrectHorseBatteryStaple!")
    assert len(new_totp_secret()) == 32
    assert verify_totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "287082", at_time=59)
    assert not verify_totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "000000", at_time=59)