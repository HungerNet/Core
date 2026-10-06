from __future__ import annotations

import secrets
from datetime import UTC, datetime
from urllib.parse import quote, urlsplit

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import bearer_scheme, get_current_user_id, get_db, require_csrf
from app.core.security import (
    hash_token,
    new_totp_secret,
    verify_password,
    verify_session_token,
    verify_totp,
)
from app.db.models import Role, Session, User
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
    if payload is None:
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
