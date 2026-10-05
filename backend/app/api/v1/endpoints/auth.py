from __future__ import annotations

import secrets
from datetime import UTC, datetime
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import bearer_scheme, get_current_user_id, get_db, require_csrf
from app.core.security import hash_token, verify_session_token
from app.db.models import Role, Session, User
from app.integrations.oauth import OAuthProviderError, authorization_url, fetch_identity
from app.schemas.auth import SessionStatusResponse, SessionUserResponse
from app.services.auth_service import AuthService
from app.services.auth_service import AuthFlowError
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/auth", tags=["auth"])


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
    if provider not in settings.allowed_oauth_providers:
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
    if provider not in settings.allowed_oauth_providers:
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
