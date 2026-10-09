from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.security import encrypt_secret
from app.db.base import Base
from app.db.models import OAuthProviderConfig
from app.integrations.oauth import (
    OAuthProviderError,
    ProviderConfig,
    fetch_identity,
    load_provider_config,
    verify_provider_credentials,
)


@pytest.mark.asyncio
async def test_database_oauth_configuration_decrypts_and_honors_disabled_state() -> None:
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        assert await load_provider_config("microsoft", db) is None
        row = OAuthProviderConfig(
            provider="microsoft",
            client_id="microsoft-client-id",
            encrypted_client_secret=encrypt_secret("microsoft-client-secret"),
            enabled=True,
        )
        db.add(row)
        await db.commit()

        config = await load_provider_config("microsoft", db)
        assert config is not None
        assert config.client_id == "microsoft-client-id"
        assert config.client_secret == "microsoft-client-secret"
        assert "microsoft-client-secret" not in row.encrypted_client_secret

        row.enabled = False
        await db.commit()
        assert await load_provider_config("microsoft", db) is None

    await engine.dispose()


@pytest.mark.asyncio
async def test_microsoft_oidc_validates_signature_audience_issuer_and_nonce() -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    now = datetime.now(UTC)
    tenant_id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    claims = {
        "aud": "microsoft-client-id",
        "iss": f"https://login.microsoftonline.com/{tenant_id}/v2.0",
        "sub": "stable-subject",
        "tid": tenant_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=5)).timestamp()),
        "nonce": "expected-nonce",
        "name": "Member Name",
        "preferred_username": "member@example.test",
        "email": "member@example.test",
        "email_verified": True,
    }
    id_token = jwt.encode(
        claims,
        private_key,
        algorithm="RS256",
        headers={"kid": "test-key"},
    )
    jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key()))
    jwk.update({"kid": "test-key", "kty": "RSA"})

    def respond(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/token"):
            return httpx.Response(200, json={"id_token": id_token})
        if request.url.path.endswith("/keys"):
            return httpx.Response(200, json={"keys": [jwk]})
        return httpx.Response(404)

    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        identity = await fetch_identity(
            "microsoft",
            code="authorization-code",
            code_verifier="verifier",
            expected_nonce="expected-nonce",
            redirect_uri="https://auth.example.test/callback",
            client=client,
            config=ProviderConfig(
                client_id="microsoft-client-id",
                client_secret="client-secret",
                authorize_url="https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
                token_url="https://login.microsoftonline.com/common/oauth2/v2.0/token",
                user_url="https://graph.microsoft.com/oidc/userinfo",
                scopes=("openid", "profile", "email"),
            ),
        )

    assert identity.provider_subject == "stable-subject"
    assert identity.email == "member@example.test"
    assert identity.email_verified


@pytest.mark.asyncio
async def test_provider_test_rejects_invalid_client_credentials() -> None:
    def respond(_: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "invalid_client"})

    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        with pytest.raises(OAuthProviderError, match="rejected"):
            await verify_provider_credentials(
                "microsoft",
                "wrong-client-id",
                "wrong-client-secret",
                client=client,
            )
