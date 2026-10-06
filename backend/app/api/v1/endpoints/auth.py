from __future__ import annotations

import base64
import hashlib
import re
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import quote, urlencode, urlsplit

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import bearer_scheme, get_current_user_id, get_db, require_csrf
from app.core.security import (
    generate_session_token,
    hash_token,
    new_totp_secret,
    verify_password,
    verify_session_token,
    verify_totp,
)
from app.db.models import OAuthTransaction, Role, Session, User
from app.integrations.oauth import (
    OAuthProviderError,
    authorization_url,
    configured_oauth_providers,
    fetch_identity,
)
from app.schemas.auth import (
    CredentialsRequest,
    MfaRequest,
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


def _registered_app(client_id: str, redirect_uri: str) -> str:
    callbacks = settings.oauth_app_redirect_uris.get(client_id)
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
        select(User).where(
            (func.lower(User.email) == normalized) | (func.lower(User.username) == normalized)
        )
    )


def _totp_uri(email: str, secret: str) -> str:
    label = quote(f"HungerNet:{email}", safe="")
    return f"otpauth://totp/{label}?secret={secret}&issuer=HungerNet&algorithm=SHA1&digits=6&period=30"


def _require_trusted_auth_origin(request: Request = None) -> None:
    if request is None:
        return
    origin = request.headers.get("origin")
    if origin and origin not in settings.cors_allowed_origins:
        raise HTTPException(status_code=403, detail="Untrusted request origin")


async def _create_login_response(
    request: Request = None,
    response: Response = None,
    db: AsyncSession = None,
    user: User = None,
) -> dict[str, bool]:
    device_label = "Browser"
    if request is not None:
        device_label = request.headers.get("user-agent", "Browser")[:160]
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
        samesite=settings.session_cookie_same_site,
        domain=settings.session_cookie_domain,
        path="/",
    )
    return {"authenticated": True}


@router.get("/providers")
async def oauth_providers() -> dict[str, list[str]]:
    return {"providers": configured_oauth_providers()}


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
) -> dict[str, str | int]:
    _registered_app(payload.client_id, payload.redirect_uri)
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

    transaction.consumed_at = datetime.now(UTC)
    await db.commit()
    access_token = generate_session_token(
        user.id,
        session.id,
        scope="profile",
        audience=payload.client_id,
        expires_minutes=settings.jwt_expiry_minutes,
    )
    return {
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": settings.jwt_expiry_minutes * 60,
        "scope": "profile",
    }


@router.get("/userinfo")
async def authorized_user_info(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str | None]:
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
        or client_id not in settings.oauth_app_redirect_uris
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
    user = await db.scalar(select(User).where(User.id == claims["sub"], User.is_active.is_(True)))
    if session is None or user is None:
        raise HTTPException(status_code=401, detail="HungerNet session is no longer active")
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    request: Request = None,
) -> dict[str, str]:
    _require_trusted_auth_origin(request)
    try:
        user, secret = await AuthService.register_local_user(
            db,
            email=payload.email,
            username=payload.username,
            password=payload.password,
        )
    except AuthFlowError as error:
        raise HTTPException(status_code=error.status_code, detail=error.message) from error
    except IntegrityError as error:
        await db.rollback()
        raise HTTPException(
            status_code=409, detail="Email or username is already registered"
        ) from error
    return {
        "setupSecret": secret,
        "provisioningUri": _totp_uri(user.email or payload.email, secret),
    }


@router.post("/mfa/setup")
async def setup_mfa(
    payload: CredentialsRequest,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    _require_trusted_auth_origin(request)
    user = await _local_user(db, payload.identifier)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email, username, or password")
    if user.totp_enabled:
        raise HTTPException(
            status_code=409, detail="Multi-factor authentication is already enabled"
        )
    user.totp_secret = new_totp_secret()
    await db.commit()
    return {
        "setupSecret": user.totp_secret,
        "provisioningUri": _totp_uri(user.email or user.username, user.totp_secret),
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
        or not verify_password(payload.password, user.password_hash)
        or not user.totp_secret
        or not verify_totp(user.totp_secret, payload.code)
    ):
        raise HTTPException(status_code=401, detail="Credentials or authenticator code are invalid")
    if not user.totp_enabled:
        user.totp_enabled = True
        await db.commit()
    return await _create_login_response(request, response_obj, db, user)


@router.post("/login")
async def login(
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
        or not user.totp_enabled
        or not user.totp_secret
        or not verify_password(payload.password, user.password_hash)
        or not verify_totp(user.totp_secret, payload.code)
    ):
        raise HTTPException(status_code=401, detail="Credentials or authenticator code are invalid")
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
async def issue_csrf_token(response: Response) -> dict[str, str]:
    token = secrets.token_urlsafe(32)
    response.set_cookie(
        settings.csrf_cookie_name,
        token,
        max_age=3600,
        secure=settings.session_cookie_secure,
        httponly=False,
        samesite=settings.session_cookie_same_site,
        domain=settings.session_cookie_domain,
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
    if provider not in configured_oauth_providers():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported OAuth provider")
    fallback = settings.allowed_return_origins[0] if settings.allowed_return_origins else ""
    destination = redirect_to or f"{fallback}/profile"
    parsed = urlsplit(destination)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password or origin not in settings.allowed_return_origins:
        raise HTTPException(status_code=400, detail="Return URL is not allowlisted")

    redirect_uri = f"{settings.oauth_callback_base_url.rstrip('/')}/auth/oauth/{provider}/callback"
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
        )
    except (AuthFlowError, OAuthProviderError) as error:
        raise HTTPException(status_code=503, detail="OAuth provider is unavailable") from error

    response = RedirectResponse(url, status_code=302)
    response.set_cookie(
        f"{settings.csrf_cookie_name}_oauth",
        state,
        max_age=600,
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite="lax",
        domain=settings.session_cookie_domain,
        path=f"{settings.api_v1_prefix}/auth/oauth/{provider}/callback",
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
    if provider not in configured_oauth_providers():
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
        )
        user = await AuthService.resolve_identity(
            db,
            provider=provider,
            identity_data=identity,
            purpose=transaction.purpose,
            linking_user_id=transaction.user_id,
        )
    except AuthFlowError as exception:
        raise HTTPException(status_code=exception.status_code, detail=exception.message) from exception
    except OAuthProviderError as exception:
        raise HTTPException(status_code=400, detail="Provider identity could not be verified") from exception

    response = RedirectResponse(transaction.return_to, status_code=303)
    response.delete_cookie(
        cookie_name,
        domain=settings.session_cookie_domain,
        path=f"{settings.api_v1_prefix}/auth/oauth/{provider}/callback",
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite="lax",
    )
    if transaction.purpose == "login":
        token, session = await AuthService.issue_session(
            db,
            user=user,
            device_label=request.headers.get("user-agent", "Browser")[:160],
        )
        max_age = max(0, int((session.expires_at - datetime.now(UTC)).total_seconds()))
        response.set_cookie(
            settings.session_cookie_name,
            token,
            max_age=max_age,
            expires=session.expires_at,
            httponly=True,
            secure=settings.session_cookie_secure,
            samesite=settings.session_cookie_same_site,
            domain=settings.session_cookie_domain,
            path="/",
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
    if token:
        session = await db.scalar(
            select(Session).where(Session.user_id == user_id, Session.token_hash == hash_token(token))
        )
        if session and session.revoked_at is None:
            session.revoked_at = datetime.now(UTC)
            await db.commit()
    response = Response(status_code=204)
    response.delete_cookie(
        settings.session_cookie_name,
        domain=settings.session_cookie_domain,
        path="/",
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite=settings.session_cookie_same_site,
    )
    response.delete_cookie(settings.csrf_cookie_name, domain=settings.session_cookie_domain, path="/")
    return response


@router.get("/me")
async def current_user(user_id: str = Depends(get_current_user_id)) -> dict[str, str]:
    return {"user_id": user_id, "status": "ok"}
