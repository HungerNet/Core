import pytest
from pydantic import SecretStr

from app.core.config import (
    WORKERS_DEV_ORIGIN,
    Settings,
    is_allowed_origin,
    settings,
)
from app.core.security import hash_password, new_totp_secret, verify_password, verify_totp
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
    monkeypatch.setattr(settings, "oauth_callback_base_url", "https://auth.example.test/api/v1")
    monkeypatch.setattr(
        settings,
        "allowed_return_origins",
        ["https://accounts.example.test", WORKERS_DEV_ORIGIN],
    )
    assert validator()

    monkeypatch.setattr(settings, client_id_field, " ")
    assert not validator()

    monkeypatch.setattr(settings, client_id_field, "client-id")
    monkeypatch.setattr(settings, "oauth_callback_base_url", "http://auth.example.test/api/v1")
    assert not validator()

    monkeypatch.setattr(settings, "oauth_callback_base_url", "https://auth.example.test/api/v1")
    monkeypatch.setattr(settings, "allowed_return_origins", [])
    assert not validator()


def test_missing_oauth_credentials_do_not_block_production_settings() -> None:
    configured = Settings(
        _env_file=None,
        environment="production",
        jwt_secret="production-secret-that-is-long-enough-123456",
        session_cookie_secure=True,
        cors_allowed_origins=["https://accounts.example.test"],
    )

    assert configured.google_client_id is None
    assert configured.github_client_secret is None
    assert configured.discord_client_secret is None


@pytest.mark.parametrize(
    ("origin", "expected"),
    [
        ("https://preview.millered001.workers.dev", True),
        ("https://nested.preview.millered001.workers.dev", True),
        ("http://preview.millered001.workers.dev", False),
        ("https://millered001.workers.dev", False),
        ("https://preview.millered001.workers.dev.attacker.test", False),
        ("https://preview.millered001.workers.dev:8443", False),
    ],
)
def test_workers_dev_origins_are_scoped_to_https_subdomains(origin: str, expected: bool) -> None:
    assert is_allowed_origin(origin, ["https://accounts.hungernet.dev"]) is expected


def test_workers_dev_wildcard_is_accepted_in_origin_configuration() -> None:
    configured = Settings(
        _env_file=None,
        environment="production",
        jwt_secret="production-secret-that-is-long-enough-123456",
        session_cookie_secure=True,
        cors_allowed_origins=[WORKERS_DEV_ORIGIN],
        allowed_return_origins=[WORKERS_DEV_ORIGIN],
    )

    assert configured.cors_allowed_origins == [WORKERS_DEV_ORIGIN]
    assert configured.allowed_return_origins == [WORKERS_DEV_ORIGIN]


def test_configured_provider_list_skips_incomplete_providers(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    monkeypatch.setattr(settings, "allowed_oauth_providers", ["google", "github"])
    monkeypatch.setattr(settings, "google_client_id", None)
    monkeypatch.setattr(settings, "google_client_secret", None)
    monkeypatch.setattr(settings, "github_client_id", "client-id")
    monkeypatch.setattr(settings, "github_client_secret", SecretStr("client-secret"))
    monkeypatch.setattr(settings, "oauth_callback_base_url", "https://auth.example.test/api/v1")
    monkeypatch.setattr(settings, "allowed_return_origins", ["https://accounts.example.test"])

    assert configured_oauth_providers(log_warnings=True) == ["github"]
    assert "oauth_provider_disabled" in caplog.text


def test_password_hash_and_totp_validation() -> None:
    encoded = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", encoded)
    assert not verify_password("incorrect", encoded)
    assert len(new_totp_secret()) == 32
    assert verify_totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "287082", at_time=59)
    assert not verify_totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "000000", at_time=59)