import pytest
from pydantic import SecretStr

import app.integrations.oauth as oauth_module
from app.core.config import (
    CORS_ORIGINS,
    RETURN_ORIGINS,
    WORKERS_DEV_ACCOUNT_ORIGIN,
    Settings,
    is_allowed_origin,
    settings,
)
from app.core.security import (
    hash_password,
    new_totp_secret,
    validate_password,
    verify_password,
    verify_totp,
)
from app.integrations.oauth import (
    configured_oauth_providers,
    is_discord_configured,
    is_github_configured,
    is_google_configured,
)


@pytest.mark.parametrize(
    ("client_id_field", "secret_field", "validator"),
    [
        ("google_client_id", "google_client_secret", is_google_configured),
        ("github_client_id", "github_client_secret", is_github_configured),
        ("discord_client_id", "discord_client_secret", is_discord_configured),
    ],
)
def test_provider_requires_credentials_and_shared_redirect_configuration(
    monkeypatch: pytest.MonkeyPatch,
    client_id_field: str,
    secret_field: str,
    validator,
) -> None:
    monkeypatch.setattr(settings, client_id_field, "client-id")
    monkeypatch.setattr(settings, secret_field, SecretStr("client-secret"))
    monkeypatch.setattr(oauth_module, "OAUTH_CALLBACK_ENDPOINT", "https://auth.example.test/api/v1")
    monkeypatch.setattr(oauth_module, "RETURN_ORIGINS", ("https://account.example.test",))
    assert validator()

    monkeypatch.setattr(settings, client_id_field, " ")
    assert not validator()

    monkeypatch.setattr(settings, client_id_field, "client-id")
    monkeypatch.setattr(oauth_module, "OAUTH_CALLBACK_ENDPOINT", "http://auth.example.test/api/v1")
    assert not validator()

    monkeypatch.setattr(oauth_module, "OAUTH_CALLBACK_ENDPOINT", "https://auth.example.test/api/v1")
    monkeypatch.setattr(oauth_module, "RETURN_ORIGINS", ())
    assert not validator()


def test_missing_oauth_credentials_do_not_block_production_settings() -> None:
    configured = Settings(
        _env_file=None,
        environment="production",
        jwt_secret="production-secret-that-is-long-enough-123456",
        session_cookie_secure=True,
        totp_encryption_key=SecretStr("totp-production-secret-that-is-long-enough"),
    )

    assert configured.google_client_id is None
    assert configured.github_client_secret is None
    assert configured.discord_client_secret is None


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


def test_configured_provider_list_skips_incomplete_providers(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    monkeypatch.setattr(settings, "allowed_oauth_providers", ["google", "github"])
    monkeypatch.setattr(settings, "google_client_id", None)
    monkeypatch.setattr(settings, "google_client_secret", None)
    monkeypatch.setattr(settings, "github_client_id", "client-id")
    monkeypatch.setattr(settings, "github_client_secret", SecretStr("client-secret"))
    monkeypatch.setattr(oauth_module, "OAUTH_CALLBACK_ENDPOINT", "https://auth.example.test/api/v1")
    monkeypatch.setattr(oauth_module, "RETURN_ORIGINS", ("https://account.example.test",))

    assert configured_oauth_providers(log_warnings=True) == ["github"]
    assert "oauth_provider_disabled" in caplog.text


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