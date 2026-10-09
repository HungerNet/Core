from __future__ import annotations

import base64
import hashlib
import re
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qsl, quote, urlencode, urlsplit, urlunsplit

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import (
    API_ROUTE_PREFIX,
    APP_CALLBACKS,
    CORS_ORIGINS,
    NORMAL_SHARED_COOKIE_DOMAIN,
    OAUTH_CALLBACK_ENDPOINT,
    RETURN_ORIGINS,
    app_csrf_cookie_name,
    is_allowed_origin,
    is_workers_dev_origin,
    settings,
)
from app.core.deps import bearer_scheme, get_current_user_id, get_db, require_csrf
from app.core.security import (
    decrypt_totp_secret,
    encrypt_totp_secret,
    generate_session_token,
    hash_token,
    hash_totp_secret,
    new_totp_secret,
    verify_password,
    verify_session_token,
    verify_totp,
)
from app.db.models import AppRefreshToken, OAuthTransaction, Role, Session, User
from app.integrations.oauth import (
    OAuthProviderError,
    authorization_url,
    configured_oauth_providers_from_db,
    fetch_identity,
    load_provider_config,
)
from app.schemas.auth import (
    CredentialsRequest,
    MfaChallengeRequest,
    MfaRequest,
    MfaSetupChallengeRequest,
    RegisterRequest,
    SessionStatusResponse,
    SessionUserResponse,
)
from app.services.auth_service import AuthFlowError, AuthService
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/auth", tags=["auth"])

APP_NAMES = {
    "admin": "HungerNet Admin",
    "hungernet": "HungerNet",
    "hungersmp": "Hunger SMP",
    "ifamished": "iFamished",
    "optifineforfabric": "OptiFine for Fabric",
}


class AppAuthorizationRequest(BaseModel):
    client_id: str = Field(min_length=1, max_length=48)
    redirect_uri: str = Field(min_length=1, max_length=500)
    state: str = Field(min_length=32, max_length=128)
    code_challenge: str = Field(min_length=43, max_length=43)


class AppTokenRequest(BaseModel):
    client_id: str = Field(min_length=1, max_length=48)
    redirect_uri: str = Field(min_length=1, max_length=500)
    code: str = Field(min_length=32, max_length=128)
    code_verifier: str = Field(min_length=43, max_length=128)


class AppRefreshRequest(BaseModel):
    client_id: str = Field(min_length=1, max_length=48)


def _registered_app(client_id: str, redirect_uri: str) -> str:
    callbacks = APP_CALLBACKS.get(client_id)
    if client_id not in APP_NAMES or callbacks is None:
        raise HTTPException(status_code=400, detail="Unknown HungerNet application")
    if redirect_uri not in callbacks:
        raise HTTPException(
            status_code=400,
            detail="Redirect URL is not registered for this application",
        )
    return APP_NAMES[client_id]


async def _local_user(db: AsyncSession, identifier: str) -> User | None:
    normalized = identifier.strip().lower()
    return await db.scalar(
        select(User)
        .where(
            (func.lower(User.email) == normalized) | (func.lower(User.username) == normalized)
        )
        .options(selectinload(User.roles))
    )


def _requires_mfa(user: User) -> bool:
    return user.is_superuser or any(role.requires_mfa for role in user.roles)


def _totp_uri(email: str, secret: str) -> str:
    label = quote(f"HungerNet:{email}", safe="")
    return f"otpauth://totp/{label}?secret={secret}&issuer=HungerNet&algorithm=SHA1&digits=6&period=30"


def _mfa_challenge_return_url(return_to: str, challenge: str, *, setup_required: bool) -> str:
    destination = urlsplit(return_to)
    query = [
        (key, value)
        for key, value in parse_qsl(destination.query, keep_blank_values=True)
        if key not in {"mfa_challenge", "mfa_setup"}
    ]
    query.append(("mfa_challenge", challenge))
    if setup_required:
        query.append(("mfa_setup", "1"))
    return urlunsplit(
        (
            destination.scheme,
            destination.netloc,
            destination.path,
            urlencode(query),
            destination.fragment,
        )
    )


def _require_trusted_auth_origin(request: Request = None) -> None:
    if request is None:
        return
    origin = request.headers.get("origin")
    if origin and not is_allowed_origin(origin, CORS_ORIGINS):
        raise HTTPException(status_code=403, detail="Untrusted request origin")


def _auth_cookie_policy(
    origin: str | None,
    *,
    same_site: str | None = None,
) -> tuple[str | None, str]:
    cookie_domain = NORMAL_SHARED_COOKIE_DOMAIN
    cookie_same_site = same_site or settings.session_cookie_same_site
    if origin and is_workers_dev_origin(origin):
        cookie_domain = None
        if same_site is None and settings.session_cookie_secure:
            cookie_same_site = "none"
    elif origin and urlsplit(origin).hostname in {"localhost", "127.0.0.1"}:
        cookie_domain = None
    return cookie_domain, cookie_same_site


def _refresh_cookie_name(client_id: str) -> str:
    return f"hungernet_refresh_{client_id}"


def _refresh_cookie_policy(origin: str | None) -> tuple[str | None, str]:
    cookie_domain, cookie_same_site = _auth_cookie_policy(origin)
    if origin:
        hostname = urlsplit(origin).hostname
        if hostname and hostname != "hungernet.dev" and not hostname.endswith(".hungernet.dev"):
            cookie_domain = None
    return cookie_domain, cookie_same_site


def _require_app_origin(
    client_id: str,
    origin: str | None,
    redirect_uri: str | None = None,
) -> None:
    callbacks = APP_CALLBACKS.get(client_id, [])
    if not origin or f"{origin.rstrip('/')}/auth/callback" not in callbacks:
        raise HTTPException(status_code=403, detail="Untrusted application origin")
    if redirect_uri:
        parsed_redirect = urlsplit(redirect_uri)
        redirect_origin = f"{parsed_redirect.scheme}://{parsed_redirect.netloc}"
        if redirect_origin != origin:
            raise HTTPException(
                status_code=403,
                detail="Application origin does not match redirect URL",
            )


def _set_refresh_cookie(
    response: Response,
    *,
    client_id: str,
    token: str,
    expires_at: datetime,
    origin: str | None,
) -> None:
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    cookie_domain, cookie_same_site = _refresh_cookie_policy(origin)
    response.set_cookie(
        _refresh_cookie_name(client_id),
        token,
        max_age=max(0, int((expires_at - datetime.now(UTC)).total_seconds())),
        expires=expires_at,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=cookie_same_site,
        domain=cookie_domain,
        path="/",
    )


async def _create_login_response(
    request: Request = None,
    response: Response = None,
    db: AsyncSession = None,
    user: User = None,
) -> dict[str, bool]:
    device_label = "Browser"
    origin = None
    if request is not None:
        device_label = request.headers.get("user-agent", "Browser")[:160]
        origin = request.headers.get("origin")
    cookie_domain, cookie_same_site = _auth_cookie_policy(origin)
    token, session = await AuthService.issue_session(
        db,
        user=user,
        device_label=device_label,
    )
    max_age = max(0, int((session.expires_at - datetime.now(UTC)).total_seconds()))
    response.set_cookie(
        settings.session_cookie_name,
        token,
        max_age=max_age,
        expires=session.expires_at,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=cookie_same_site,
        domain=cookie_domain,
        path="/",
    )
    return {"authenticated": True}


@router.get("/providers")
async def oauth_providers(db: AsyncSession = Depends(get_db)) -> dict[str, list[str]]:
    return {"providers": await configured_oauth_providers_from_db(db)}


@router.get("/authorize")
async def authorization_details(
    client_id: str = Query(min_length=1, max_length=48),
    redirect_uri: str = Query(min_length=1, max_length=500),
    scope: str = Query(default="profile", max_length=64),
) -> dict[str, str]:
    if scope != "profile":
        raise HTTPException(status_code=400, detail="Unsupported authorization scope")
    return {
        "client_id": client_id,
        "app_name": _registered_app(client_id, redirect_uri),
        "redirect_uri": redirect_uri,
        "scope": scope,
    }


@router.post("/authorize", dependencies=[Depends(require_csrf)])
async def authorize_application(
    payload: AppAuthorizationRequest,
    request: Request,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    _registered_app(payload.client_id, payload.redirect_uri)
    if not re.fullmatch(r"[A-Za-z0-9_-]{43}", payload.code_challenge):
        raise HTTPException(status_code=400, detail="Invalid PKCE challenge")
    if not re.fullmatch(r"[A-Za-z0-9_-]{32,128}", payload.state):
        raise HTTPException(status_code=400, detail="Invalid authorization state")

    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        authorization = request.headers.get("authorization", "").split(maxsplit=1)
        if len(authorization) == 2 and authorization[0].lower() == "bearer":
            token = authorization[1]
    claims = verify_session_token(token) if token else None
    if (
        claims is None
        or claims.get("scope", "session") != "session"
        or claims.get("sub") != user_id
    ):
        raise HTTPException(status_code=401, detail="A valid HungerNet session is required")

    session = await db.scalar(
        select(Session).where(
            Session.id == claims["sid"],
            Session.user_id == user_id,
            Session.revoked_at.is_(None),
            Session.expires_at > datetime.now(UTC),
        )
    )
    if session is None:
        raise HTTPException(status_code=401, detail="HungerNet session is no longer active")

    code = secrets.token_urlsafe(32)
    db.add(
        OAuthTransaction(
            state_hash=hash_token(code),
            provider=f"app:{payload.client_id}",
            redirect_uri=payload.redirect_uri,
            return_to=payload.redirect_uri,
            code_verifier=payload.code_challenge,
            nonce=payload.state,
            purpose="authorize",
            user_id=user_id,
            session_id=session.id,
            expires_at=datetime.now(UTC) + timedelta(minutes=5),
        )
    )
    await db.commit()
    query = urlencode({"code": code, "state": payload.state})
    return {"redirect_to": f"{payload.redirect_uri}?{query}"}


@router.post("/token")
async def exchange_authorization_code(
    payload: AppTokenRequest,
    db: AsyncSession = Depends(get_db),
    request: Request = None,
    response: Response = None,
) -> dict[str, str | int]:
    _registered_app(payload.client_id, payload.redirect_uri)
    origin = request.headers.get("origin") if request else None
    if origin:
        _require_app_origin(payload.client_id, origin, payload.redirect_uri)
    if not re.fullmatch(r"[A-Za-z0-9_-]{43,128}", payload.code_verifier):
        raise HTTPException(status_code=400, detail="Invalid PKCE verifier")
    digest = hashlib.sha256(payload.code_verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest)
    challenge = challenge.rstrip(b"=").decode("ascii")
    transaction = await db.scalar(
        select(OAuthTransaction)
        .where(
            OAuthTransaction.state_hash == hash_token(payload.code),
            OAuthTransaction.provider == f"app:{payload.client_id}",
            OAuthTransaction.purpose == "authorize",
            OAuthTransaction.redirect_uri == payload.redirect_uri,
            OAuthTransaction.consumed_at.is_(None),
            OAuthTransaction.expires_at > datetime.now(UTC),
        )
        .with_for_update()
    )
    if transaction is None or not secrets.compare_digest(transaction.code_verifier, challenge):
        raise HTTPException(status_code=400, detail="Authorization code is invalid or expired")
    if not transaction.user_id or not transaction.session_id:
        raise HTTPException(status_code=400, detail="Authorization code is incomplete")
    session = await db.scalar(
        select(Session).where(
            Session.id == transaction.session_id,
            Session.user_id == transaction.user_id,
            Session.revoked_at.is_(None),
            Session.expires_at > datetime.now(UTC),
        )
    )
    user = await db.scalar(
        select(User).where(User.id == transaction.user_id, User.is_active.is_(True))
    )
    if session is None or user is None:
        raise HTTPException(status_code=401, detail="HungerNet session is no longer active")

    now = datetime.now(UTC)
    refresh_token = secrets.token_urlsafe(48)
    db.add(
        AppRefreshToken(
            session_id=session.id,
            user_id=user.id,
            client_id=payload.client_id,
            token_hash=hash_token(refresh_token),
            expires_at=session.expires_at,
        )
    )
    transaction.consumed_at = now
    await db.commit()
    access_token = generate_session_token(
        user.id,
        session.id,
        scope="profile",
        audience=payload.client_id,
        expires_minutes=settings.access_token_expiry_minutes,
    )
    if response is None:
        response = Response()
    _set_refresh_cookie(
        response,
        client_id=payload.client_id,
        token=refresh_token,
        expires_at=session.expires_at,
        origin=origin,
    )
    return {
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": settings.access_token_expiry_minutes * 60,
        "scope": "profile",
    }


@router.post("/refresh")
async def refresh_application_token(
    payload: AppRefreshRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str | int]:
    _require_app_origin(payload.client_id, request.headers.get("origin"))
    await require_csrf(request)
    token = request.cookies.get(_refresh_cookie_name(payload.client_id))
    if not token:
        raise HTTPException(status_code=401, detail="Application refresh token is missing")

    now = datetime.now(UTC)
    refresh_record = await db.scalar(
        select(AppRefreshToken)
        .where(
            AppRefreshToken.token_hash == hash_token(token),
            AppRefreshToken.client_id == payload.client_id,
            AppRefreshToken.expires_at > now,
        )
        .with_for_update()
    )
    if refresh_record is None:
        raise HTTPException(
            status_code=401,
            detail="Application refresh token is invalid or expired",
        )

    session = await db.scalar(
        select(Session).where(
            Session.id == refresh_record.session_id,
            Session.user_id == refresh_record.user_id,
            Session.revoked_at.is_(None),
            Session.expires_at > now,
        )
    )
    user = await db.scalar(
        select(User).where(User.id == refresh_record.user_id, User.is_active.is_(True))
    )
    if session is None or user is None:
        raise HTTPException(status_code=401, detail="HungerNet session is no longer active")

    if refresh_record.revoked_at is not None:
        revoked_at = refresh_record.revoked_at
        if revoked_at.tzinfo is None:
            revoked_at = revoked_at.replace(tzinfo=UTC)
        if now - revoked_at <= timedelta(seconds=15):
            access_token = generate_session_token(
                user.id,
                session.id,
                scope="profile",
                audience=payload.client_id,
                expires_minutes=settings.access_token_expiry_minutes,
            )
            return {
                "access_token": access_token,
                "token_type": "Bearer",
                "expires_in": settings.access_token_expiry_minutes * 60,
                "scope": "profile",
            }

        session.revoked_at = now
        active_tokens = await db.scalars(
            select(AppRefreshToken).where(
                AppRefreshToken.session_id == session.id,
                AppRefreshToken.revoked_at.is_(None),
            )
        )
        for active_token in active_tokens:
            active_token.revoked_at = now
        await db.commit()
        raise HTTPException(status_code=401, detail="Application refresh token reuse detected")

    refresh_record.revoked_at = now
    replacement_token = secrets.token_urlsafe(48)
    db.add(
        AppRefreshToken(
            session_id=session.id,
            user_id=user.id,
            client_id=payload.client_id,
            token_hash=hash_token(replacement_token),
            expires_at=session.expires_at,
        )
    )
    await db.commit()

    _set_refresh_cookie(
        response,
        client_id=payload.client_id,
        token=replacement_token,
        expires_at=session.expires_at,
        origin=request.headers.get("origin"),
    )
    access_token = generate_session_token(
        user.id,
        session.id,
        scope="profile",
        audience=payload.client_id,
        expires_minutes=settings.access_token_expiry_minutes,
    )
    return {
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": settings.access_token_expiry_minutes * 60,
        "scope": "profile",
    }


@router.get("/userinfo")
async def authorized_user_info(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str | None | list[str]]:
    token = (
        credentials.credentials
        if credentials and credentials.scheme.lower() == "bearer"
        else None
    )
    claims = verify_session_token(token) if token else None
    client_id = claims.get("aud") if claims else None
    if (
        claims is None
        or claims.get("scope") != "profile"
        or client_id not in APP_CALLBACKS
    ):
        raise HTTPException(status_code=401, detail="A profile access token is required")
    session = await db.scalar(
        select(Session).where(
            Session.id == claims["sid"],
            Session.user_id == claims["sub"],
            Session.revoked_at.is_(None),
            Session.expires_at > datetime.now(UTC),
        )
    )
    user = await db.scalar(
        select(User)
        .where(User.id == claims["sub"], User.is_active.is_(True))
        .options(
            selectinload(User.roles).selectinload(Role.permissions),
            selectinload(User.permissions),
        )
    )
    if session is None or user is None:
        raise HTTPException(status_code=401, detail="HungerNet session is no longer active")
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "permissions": PermissionService.effective_permissions(user),
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    request: Request = None,
    response: Response = None,
) -> dict[str, bool]:
    _require_trusted_auth_origin(request)
    if response is None:
        response = Response()
    try:
        user, _ = await AuthService.register_local_user(
            db,
            email=payload.email,
            username=payload.username,
            display_name=payload.display_name,
            password=payload.password,
        )
    except AuthFlowError as error:
        raise HTTPException(status_code=error.status_code, detail=error.message) from error
    except IntegrityError as error:
        await db.rollback()
        raise HTTPException(
            status_code=409, detail="Email is already registered"
        ) from error
    return await _create_login_response(request, response, db, user)


@router.post("/mfa/setup")
async def setup_mfa(
    payload: CredentialsRequest,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    _require_trusted_auth_origin(request)
    user = await _local_user(db, payload.identifier)
    if (
        user is None
        or not user.is_active
        or not verify_password(payload.password, user.password_hash)
    ):
        raise HTTPException(status_code=401, detail="Invalid email, username, or password")
    user = await db.scalar(
        select(User).where(User.id == user.id).with_for_update()
    )
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email, username, or password")
    if user.totp_enabled and user.totp_secret:
        raise HTTPException(
            status_code=409, detail="Multi-factor authentication is already enabled"
        )
    if user.totp_secret:
        secret = decrypt_totp_secret(user.totp_secret)
        if user.totp_secret_hash and not secrets.compare_digest(
            user.totp_secret_hash,
            hash_totp_secret(secret),
        ):
            raise HTTPException(status_code=409, detail="Stored authenticator secret is invalid")
    else:
        secret = new_totp_secret()
        user.totp_secret = encrypt_totp_secret(secret)
        user.totp_secret_hash = hash_totp_secret(secret)
        await db.commit()
    return {
        "setupSecret": secret,
        "provisioningUri": _totp_uri(user.email or user.username, secret),
    }


@router.post("/mfa/verify")
async def verify_mfa(
    payload: MfaRequest,
    request: Request = None,
    response_obj: Response = None,
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    _require_trusted_auth_origin(request)
    if response_obj is None:
        response_obj = Response()
    user = await _local_user(db, payload.identifier)
    if (
        user is None
        or not user.is_active
        or not verify_password(payload.password, user.password_hash)
        or not user.totp_secret
    ):
        raise HTTPException(status_code=401, detail="Credentials or authenticator code are invalid")
    secret = decrypt_totp_secret(user.totp_secret)
    if (
        (user.totp_secret_hash and not secrets.compare_digest(user.totp_secret_hash, hash_totp_secret(secret)))
        or not verify_totp(secret, payload.code)
    ):
        raise HTTPException(status_code=401, detail="Credentials or authenticator code are invalid")
    if not user.totp_enabled:
        user.totp_enabled = True
        await db.commit()
    return await _create_login_response(request, response_obj, db, user)


@router.post("/login")
async def login(
    payload: CredentialsRequest,
    request: Request = None,
    response_obj: Response = None,
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    _require_trusted_auth_origin(request)
    if response_obj is None:
        response_obj = Response()
    user = await _local_user(db, payload.identifier)
    if (
        user is None
        or not user.is_active
        or not verify_password(payload.password, user.password_hash)
    ):
        raise HTTPException(status_code=401, detail="Invalid email, username, or password")
    if _requires_mfa(user) and (not user.totp_enabled or not user.totp_secret):
        return {"authenticated": False, "mfaSetupRequired": True}
    if user.totp_enabled and user.totp_secret:
        return {"authenticated": False, "mfaRequired": True}
    return await _create_login_response(request, response_obj, db, user)


@router.post("/mfa/challenge/setup")
async def setup_mfa_challenge(
    payload: MfaSetupChallengeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    _require_trusted_auth_origin(request)
    transaction = await db.scalar(
        select(OAuthTransaction)
        .where(
            OAuthTransaction.state_hash == hash_token(payload.challenge),
            OAuthTransaction.provider == "mfa",
            OAuthTransaction.purpose == "mfa_setup",
            OAuthTransaction.consumed_at.is_(None),
            OAuthTransaction.expires_at > datetime.now(UTC),
        )
        .with_for_update()
    )
    if transaction is None or not transaction.user_id:
        raise HTTPException(status_code=401, detail="MFA setup request is invalid or expired")
    user = await db.scalar(
        select(User).where(User.id == transaction.user_id).with_for_update()
    )
    if user is None or not user.is_active or user.totp_enabled:
        raise HTTPException(status_code=401, detail="MFA setup request is invalid or expired")

    if user.totp_secret:
        secret = decrypt_totp_secret(user.totp_secret)
        if user.totp_secret_hash and not secrets.compare_digest(
            user.totp_secret_hash,
            hash_totp_secret(secret),
        ):
            raise HTTPException(status_code=409, detail="Stored authenticator secret is invalid")
    else:
        secret = new_totp_secret()
        user.totp_secret = encrypt_totp_secret(secret)
        user.totp_secret_hash = hash_totp_secret(secret)
        await db.commit()
    return {
        "setupSecret": secret,
        "provisioningUri": _totp_uri(user.email or user.username, secret),
    }


@router.post("/mfa/challenge/verify")
async def verify_mfa_challenge(
    payload: MfaChallengeRequest,
    request: Request,
    response_obj: Response,
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    _require_trusted_auth_origin(request)
    transaction = await db.scalar(
        select(OAuthTransaction)
        .where(
            OAuthTransaction.state_hash == hash_token(payload.challenge),
            OAuthTransaction.provider == "mfa",
            OAuthTransaction.purpose.in_(("mfa_setup", "mfa_challenge")),
            OAuthTransaction.consumed_at.is_(None),
            OAuthTransaction.expires_at > datetime.now(UTC),
        )
        .with_for_update()
    )
    if transaction is None or not transaction.user_id:
        raise HTTPException(status_code=401, detail="MFA request is invalid or expired")
    user = await db.scalar(
        select(User)
        .where(User.id == transaction.user_id, User.is_active.is_(True))
        .options(selectinload(User.roles))
    )
    if user is None or not user.totp_secret:
        raise HTTPException(status_code=401, detail="MFA request is invalid or expired")
    secret = decrypt_totp_secret(user.totp_secret)
    if (
        (user.totp_secret_hash and not secrets.compare_digest(user.totp_secret_hash, hash_totp_secret(secret)))
        or not verify_totp(secret, payload.code)
    ):
        raise HTTPException(status_code=401, detail="Authenticator code is invalid")
    if transaction.purpose == "mfa_setup":
        user.totp_enabled = True
    elif not user.totp_enabled or not _requires_mfa(user):
        raise HTTPException(status_code=401, detail="MFA request is invalid or expired")
    transaction.consumed_at = datetime.now(UTC)
    await db.commit()
    return await _create_login_response(request, response_obj, db, user)


@router.get("/session", response_model=SessionStatusResponse)
async def get_session_status(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> SessionStatusResponse:
    token = request.cookies.get(settings.session_cookie_name)
    if not token and credentials and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
    if not token:
        return SessionStatusResponse()

    payload = verify_session_token(token)
    if payload is None or payload.get("scope", "session") != "session":
        return SessionStatusResponse()
    session = await db.scalar(
        select(Session).where(
            Session.id == payload["sid"],
            Session.user_id == payload["sub"],
            Session.token_hash == hash_token(token),
            Session.revoked_at.is_(None),
            Session.expires_at > datetime.now(UTC),
        )
    )
    if session is None:
        return SessionStatusResponse()
    user = await db.scalar(
        select(User)
        .where(User.id == session.user_id, User.is_active.is_(True))
        .options(selectinload(User.roles).selectinload(Role.permissions), selectinload(User.permissions))
    )
    if user is None:
        return SessionStatusResponse()
    return SessionStatusResponse(
        authenticated=True,
        user=SessionUserResponse(
            id=user.id,
            username=user.username,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
            permissions=PermissionService.effective_permissions(user),
        ),
        expires_at=session.expires_at.isoformat(),
    )


@router.get("/csrf")
async def issue_csrf_token(
    request: Request,
    response: Response,
    client_id: str | None = None,
) -> dict[str, str]:
    if client_id:
        if client_id not in APP_CALLBACKS:
            raise HTTPException(status_code=400, detail="Unknown HungerNet application")
        _require_app_origin(client_id, request.headers.get("origin"))
    token = secrets.token_urlsafe(32)
    cookie_domain, cookie_same_site = _refresh_cookie_policy(request.headers.get("origin"))
    response.set_cookie(
        app_csrf_cookie_name(client_id) if client_id else settings.csrf_cookie_name,
        token,
        max_age=settings.session_expiry_days * 24 * 60 * 60,
        secure=settings.session_cookie_secure,
        httponly=False,
        samesite=cookie_same_site,
        domain=cookie_domain,
        path="/",
    )
    return {"csrfToken": token}


@router.get("/oauth/{provider}/start")
async def oauth_start(
    provider: str,
    request: Request,
    redirect_to: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    provider = provider.lower()
    if provider not in {item.lower() for item in settings.allowed_oauth_providers}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported OAuth provider")
    if provider not in await configured_oauth_providers_from_db(db):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported OAuth provider")
    provider_settings = await load_provider_config(provider, db)
    if provider_settings is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported OAuth provider")
    fallback = RETURN_ORIGINS[0]
    destination = redirect_to or f"{fallback}/profile"
    parsed = urlsplit(destination)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    if (
        parsed.scheme != "https"
        or not parsed.netloc
        or parsed.username
        or parsed.password
        or not is_allowed_origin(origin, RETURN_ORIGINS)
    ):
        raise HTTPException(status_code=400, detail="Return URL is not allowlisted")

    redirect_uri = f"{OAUTH_CALLBACK_ENDPOINT.rstrip('/')}/auth/oauth/{provider}/callback"
    try:
        transaction, state, challenge = await AuthService.begin_oauth(
            db,
            provider=provider,
            redirect_uri=redirect_uri,
            return_to=destination,
        )
        url = authorization_url(
            provider,
            state=state,
            nonce=transaction.nonce,
            code_challenge=challenge,
            redirect_uri=redirect_uri,
            config=provider_settings,
        )
    except (AuthFlowError, OAuthProviderError) as error:
        raise HTTPException(status_code=503, detail="OAuth provider is unavailable") from error

    response = RedirectResponse(url, status_code=302)
    cookie_domain, _ = _auth_cookie_policy(origin, same_site="lax")
    response.set_cookie(
        f"{settings.csrf_cookie_name}_oauth",
        state,
        max_age=600,
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite="lax",
        domain=cookie_domain,
        path=f"{API_ROUTE_PREFIX}/auth/oauth/{provider}/callback",
    )
    return response


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    provider = provider.lower()
    if provider not in {item.lower() for item in settings.allowed_oauth_providers}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported OAuth provider")
    if provider not in await configured_oauth_providers_from_db(db):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported OAuth provider")
    provider_settings = await load_provider_config(provider, db)
    if provider_settings is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported OAuth provider")
    cookie_name = f"{settings.csrf_cookie_name}_oauth"
    cookie_state = request.cookies.get(cookie_name)
    if error or not code or not state or not cookie_state or not secrets.compare_digest(state, cookie_state):
        raise HTTPException(status_code=400, detail="OAuth callback validation failed")

    try:
        transaction = await AuthService.consume_oauth_transaction(db, provider=provider, state=state)
        if transaction.purpose == "link":
            if not transaction.session_id or not transaction.user_id:
                raise AuthFlowError("link_session_required", "Identity link requires an active session", 401)
            original_session = await db.scalar(
                select(Session).where(
                    Session.id == transaction.session_id,
                    Session.user_id == transaction.user_id,
                    Session.revoked_at.is_(None),
                    Session.expires_at > datetime.now(UTC),
                )
            )
            if original_session is None:
                raise AuthFlowError("link_session_expired", "Sign in again before linking an identity", 401)
        identity = await fetch_identity(
            provider,
            code=code,
            code_verifier=transaction.code_verifier,
            expected_nonce=transaction.nonce,
            redirect_uri=transaction.redirect_uri,
            config=provider_settings,
        )
        user = await AuthService.resolve_identity(
            db,
            provider=provider,
            identity_data=identity,
            purpose=transaction.purpose,
            linking_user_id=transaction.user_id,
        )
        user = await db.scalar(
            select(User).where(User.id == user.id).options(selectinload(User.roles))
        )
        if user is None or not user.is_active:
            raise AuthFlowError("user_unavailable", "Account is unavailable", 401)
    except AuthFlowError as exception:
        raise HTTPException(status_code=exception.status_code, detail=exception.message) from exception
    except OAuthProviderError as exception:
        raise HTTPException(status_code=400, detail="Provider identity could not be verified") from exception

    response = RedirectResponse(transaction.return_to, status_code=303)
    return_origin = f"{urlsplit(transaction.return_to).scheme}://{urlsplit(transaction.return_to).netloc}"
    cookie_domain, _ = _auth_cookie_policy(return_origin, same_site="lax")
    if transaction.purpose == "login" and _requires_mfa(user):
        challenge = secrets.token_urlsafe(32)
        challenge_purpose = "mfa_challenge" if user.totp_enabled and user.totp_secret else "mfa_setup"
        db.add(
            OAuthTransaction(
                state_hash=hash_token(challenge),
                provider="mfa",
                redirect_uri=transaction.redirect_uri,
                return_to=transaction.return_to,
                code_verifier="",
                nonce="",
                purpose=challenge_purpose,
                user_id=user.id,
                expires_at=datetime.now(UTC) + timedelta(minutes=5),
            )
        )
        await db.commit()
        response = RedirectResponse(
            _mfa_challenge_return_url(
                transaction.return_to,
                challenge,
                setup_required=challenge_purpose == "mfa_setup",
            ),
            status_code=303,
        )
    elif transaction.purpose == "login":
        token, session = await AuthService.issue_session(
            db,
            user=user,
            device_label=request.headers.get("user-agent", "Browser")[:160],
        )
        max_age = max(0, int((session.expires_at - datetime.now(UTC)).total_seconds()))
        session_domain, session_same_site = _auth_cookie_policy(return_origin)
        response.set_cookie(
            settings.session_cookie_name,
            token,
            max_age=max_age,
            expires=session.expires_at,
            httponly=True,
            secure=settings.session_cookie_secure,
            samesite=session_same_site,
            domain=session_domain,
            path="/",
        )
    response.delete_cookie(
        cookie_name,
        domain=cookie_domain,
        path=f"{API_ROUTE_PREFIX}/auth/oauth/{provider}/callback",
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite="lax",
    )
    return response


@router.post("/logout", status_code=204, dependencies=[Depends(require_csrf)])
async def logout(
    request: Request,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> Response:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        authorization = request.headers.get("authorization", "").split(maxsplit=1)
        if len(authorization) == 2 and authorization[0].lower() == "bearer":
            token = authorization[1]
    claims = verify_session_token(token) if token else None
    session = None
    if claims:
        session_query = select(Session).where(
            Session.id == claims.get("sid"),
            Session.user_id == user_id,
            Session.revoked_at.is_(None),
        )
        if claims.get("scope", "session") == "session":
            session_query = session_query.where(Session.token_hash == hash_token(token))
        session = await db.scalar(session_query)
    if session:
        now = datetime.now(UTC)
        session.revoked_at = now
        refresh_tokens = await db.scalars(
            select(AppRefreshToken).where(
                AppRefreshToken.session_id == session.id,
                AppRefreshToken.revoked_at.is_(None),
            )
        )
        for refresh_token in refresh_tokens:
            refresh_token.revoked_at = now
        await db.commit()
    response = Response(status_code=204)
    origin = request.headers.get("origin")
    cookie_domain, cookie_same_site = _auth_cookie_policy(origin)
    refresh_cookie_domain, refresh_cookie_same_site = _refresh_cookie_policy(origin)
    response.delete_cookie(
        settings.session_cookie_name,
        domain=cookie_domain,
        path="/",
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite=cookie_same_site,
    )
    response.delete_cookie(
        settings.csrf_cookie_name,
        domain=refresh_cookie_domain,
        path="/",
        secure=settings.session_cookie_secure,
        samesite=cookie_same_site,
    )
    for client_id in APP_CALLBACKS:
        response.delete_cookie(
            app_csrf_cookie_name(client_id),
            domain=refresh_cookie_domain,
            path="/",
            secure=settings.session_cookie_secure,
            samesite=refresh_cookie_same_site,
        )
        response.delete_cookie(
            _refresh_cookie_name(client_id),
            domain=refresh_cookie_domain,
            path="/",
            secure=settings.session_cookie_secure,
            httponly=True,
            samesite=refresh_cookie_same_site,
        )
    return response


@router.get("/me")
async def current_user(user_id: str = Depends(get_current_user_id)) -> dict[str, str]:
    return {"user_id": user_id, "status": "ok"}
