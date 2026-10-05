from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode

import httpx
import jwt

from app.core.config import settings


class OAuthProviderError(Exception):
    pass


@dataclass(frozen=True)
class OAuthIdentity:
    provider_subject: str
    username: str
    display_name: str
    email: str | None
    email_verified: bool
    avatar_url: str | None


@dataclass(frozen=True)
class ProviderConfig:
    client_id: str
    client_secret: str
    authorize_url: str
    token_url: str
    user_url: str
    scopes: tuple[str, ...]


def provider_config(provider: str) -> ProviderConfig:
    provider = provider.lower()
    values: dict[str, Any] = {
        "google": (
            settings.google_client_id,
            settings.google_client_secret,
            "https://accounts.google.com/o/oauth2/v2/auth",
            "https://oauth2.googleapis.com/token",
            "https://openidconnect.googleapis.com/v1/userinfo",
            ("openid", "profile", "email"),
        ),
        "github": (
            settings.github_client_id,
            settings.github_client_secret,
            "https://github.com/login/oauth/authorize",
            "https://github.com/login/oauth/access_token",
            "https://api.github.com/user",
            ("read:user", "user:email"),
        ),
        "discord": (
            settings.discord_client_id,
            settings.discord_client_secret,
            "https://discord.com/oauth2/authorize",
            "https://discord.com/api/oauth2/token",
            "https://discord.com/api/users/@me",
            ("identify", "email"),
        ),
    }
    if provider not in values:
        raise OAuthProviderError("Unsupported OAuth provider")
    client_id, secret, authorize_url, token_url, user_url, scopes = values[provider]
    if not client_id or secret is None:
        raise OAuthProviderError(f"{provider.title()} OAuth is not configured")
    return ProviderConfig(
        client_id=client_id,
        client_secret=secret.get_secret_value(),
        authorize_url=authorize_url,
        token_url=token_url,
        user_url=user_url,
        scopes=scopes,
    )


def authorization_url(
    provider: str,
    *,
    state: str,
    nonce: str,
    code_challenge: str,
    redirect_uri: str,
) -> str:
    config = provider_config(provider)
    params = {
        "client_id": config.client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(config.scopes),
        "state": state,
        "nonce": nonce,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    if provider == "google":
        params["access_type"] = "online"
        params["prompt"] = "select_account"
    return f"{config.authorize_url}?{urlencode(params)}"


async def fetch_identity(
    provider: str,
    *,
    code: str,
    code_verifier: str,
    expected_nonce: str,
    redirect_uri: str,
    client: httpx.AsyncClient | None = None,
) -> OAuthIdentity:
    config = provider_config(provider)
    owns_client = client is None
    http = client or httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0))
    try:
        token_response = await http.post(
            config.token_url,
            data={
                "client_id": config.client_id,
                "client_secret": config.client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
                "code_verifier": code_verifier,
            },
            headers={"Accept": "application/json"},
        )
        token_response.raise_for_status()
        token_payload = token_response.json()
        access_token = (
            token_payload.get("access_token") if isinstance(token_payload, dict) else None
        )
        if not isinstance(access_token, str) or not access_token:
            raise OAuthProviderError("Provider did not return an access token")

        google_subject: str | None = None
        if provider == "google":
            id_token = token_payload.get("id_token")
            if not isinstance(id_token, str):
                raise OAuthProviderError("Google did not return an OIDC ID token")
            signing_key = await _google_signing_key(http, id_token)
            claims = jwt.decode(
                id_token,
                signing_key,
                algorithms=["RS256"],
                audience=config.client_id,
                issuer=["https://accounts.google.com", "accounts.google.com"],
                options={"require": ["sub", "exp", "iat", "nonce"]},
            )
            if not secrets_compare(claims.get("nonce"), expected_nonce):
                raise OAuthProviderError("Google OIDC nonce validation failed")
            google_subject = str(claims["sub"])

        headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
        if provider == "github":
            headers["User-Agent"] = "HungerNet-Platform"
        response = await http.get(config.user_url, headers=headers)
        response.raise_for_status()
        profile = response.json()
        identity = _normalize_identity(provider, profile)
        if google_subject is not None and identity.provider_subject != google_subject:
            raise OAuthProviderError("Google userinfo subject does not match the ID token")

        if provider == "github" and not identity.email:
            emails_response = await http.get(
                "https://api.github.com/user/emails",
                headers=headers,
            )
            emails_response.raise_for_status()
            emails = emails_response.json()
            if isinstance(emails, list):
                primary_verified = next(
                    (
                        item
                        for item in emails
                        if isinstance(item, dict) and item.get("primary") and item.get("verified")
                    ),
                    None,
                )
                if primary_verified and isinstance(primary_verified.get("email"), str):
                    identity = OAuthIdentity(
                        identity.provider_subject,
                        identity.username,
                        identity.display_name,
                        primary_verified["email"],
                        True,
                        identity.avatar_url,
                    )
        return identity
    except OAuthProviderError:
        raise
    except (httpx.HTTPError, ValueError, TypeError, KeyError) as error:
        raise OAuthProviderError("Provider authentication failed") from error
    finally:
        if owns_client:
            await http.aclose()


async def _google_signing_key(http: httpx.AsyncClient, id_token: str) -> Any:
    try:
        header = jwt.get_unverified_header(id_token)
        response = await http.get("https://www.googleapis.com/oauth2/v3/certs")
        response.raise_for_status()
        key = next(
            item
            for item in response.json().get("keys", [])
            if item.get("kid") == header.get("kid") and item.get("kty") == "RSA"
        )
        return jwt.algorithms.RSAAlgorithm.from_jwk(key)
    except (httpx.HTTPError, jwt.PyJWTError, StopIteration, TypeError, ValueError) as error:
        raise OAuthProviderError("Google signing key validation failed") from error


def secrets_compare(actual: Any, expected: str) -> bool:
    import hmac

    return isinstance(actual, str) and hmac.compare_digest(actual, expected)


def _normalize_identity(provider: str, profile: Any) -> OAuthIdentity:
    if not isinstance(profile, dict):
        raise OAuthProviderError("Provider returned an invalid user profile")

    if provider == "google":
        subject = profile.get("sub")
        username = profile.get("email") or subject
        display_name = profile.get("name") or username
        email = profile.get("email")
        verified = profile.get("email_verified") is True
        avatar = profile.get("picture")
    elif provider == "github":
        subject = profile.get("id")
        username = profile.get("login")
        display_name = profile.get("name") or username
        email = profile.get("email")
        verified = False
        avatar = profile.get("avatar_url")
    else:
        subject = profile.get("id")
        username = profile.get("username")
        display_name = profile.get("global_name") or username
        email = profile.get("email")
        verified = profile.get("verified") is True
        avatar_hash = profile.get("avatar")
        avatar = (
            f"https://cdn.discordapp.com/avatars/{subject}/{avatar_hash}.png"
            if subject and avatar_hash
            else None
        )

    if not isinstance(subject, (str, int)) or not isinstance(username, str) or not username:
        raise OAuthProviderError("Provider profile is missing a stable subject")
    return OAuthIdentity(
        provider_subject=str(subject),
        username=username,
        display_name=str(display_name or username)[:120],
        email=email if isinstance(email, str) and verified else None,
        email_verified=verified,
        avatar_url=avatar if isinstance(avatar, str) else None,
    )
