from collections.abc import AsyncGenerator
from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import hash_token, verify_session_token
from app.db.models import Role, Session, User
from app.db.session import get_db_session

bearer_scheme = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db_session():
        yield session


async def get_current_user_id(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> str:
    cookie_token = request.cookies.get(settings.session_cookie_name)
    bearer_token = credentials.credentials if credentials and credentials.scheme.lower() == "bearer" else None
    token = cookie_token or bearer_token
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    payload = verify_session_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    session_id = payload.get("sid")
    if not isinstance(user_id, str) or not user_id or not isinstance(session_id, str):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    now = datetime.now(UTC)
    db_session = await db.scalar(
        select(Session).where(
            Session.id == session_id,
            Session.user_id == user_id,
            Session.token_hash == hash_token(token),
            Session.revoked_at.is_(None),
            Session.expires_at > now,
        )
    )
    if db_session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session is revoked or expired")

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is unavailable")

    if (now - db_session.last_seen_at).total_seconds() >= 60:
        db_session.last_seen_at = now
        await db.commit()
    return user_id


async def get_current_user(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await db.scalar(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.roles).selectinload(Role.permissions), selectinload(User.permissions))
    )
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is unavailable")
    return user


def require_permission(permission: str):
    async def permission_dependency(user: User = Depends(get_current_user)) -> User:
        from app.services.permission_service import PermissionService

        if not PermissionService.has_permission(user, permission):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")
        return user

    return permission_dependency


async def require_csrf(request: Request) -> None:
    if not request.cookies.get(settings.session_cookie_name):
        return

    origin = request.headers.get("origin")
    csrf_cookie = request.cookies.get(settings.csrf_cookie_name)
    csrf_header = request.headers.get("x-csrf-token")
    if origin not in settings.cors_allowed_origins:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Untrusted request origin")
    if not csrf_cookie or not csrf_header or not secrets_compare(csrf_cookie, csrf_header):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed")


async def require_recent_auth(
    request: Request,
    user_id: str = Depends(get_current_user_id),
) -> None:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        credentials = request.headers.get("authorization", "").split(maxsplit=1)
        if len(credentials) == 2 and credentials[0].lower() == "bearer":
            token = credentials[1]
    claims = verify_session_token(token) if token else None
    if claims is None or claims.get("sub") != user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    issued_at = datetime.fromtimestamp(claims["iat"], UTC)
    age = datetime.now(UTC) - issued_at
    if age < -timedelta(seconds=30) or age > timedelta(minutes=settings.recent_auth_window_minutes):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recent authentication required")


def secrets_compare(first: str, second: str) -> bool:
    import hmac

    return hmac.compare_digest(first, second)
