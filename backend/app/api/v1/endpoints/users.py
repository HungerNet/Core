from __future__ import annotations

import logging
import re
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import (
    API_ROUTE_PREFIX,
    NORMAL_SHARED_COOKIE_DOMAIN,
    OAUTH_CALLBACK_ENDPOINT,
    RETURN_ORIGINS,
    is_workers_dev_origin,
    settings,
)
from app.core.deps import (
    get_current_user,
    get_current_user_id,
    get_db,
    require_csrf,
    require_permission,
    require_recent_auth,
)
from app.core.security import verify_session_token
from app.db.models import AuditEvent, Identity, Session, User
from app.integrations.oauth import OAuthProviderError, authorization_url
from app.schemas.public import PublicProfileResponse
from app.schemas.user import (
    LinkedIdentityResponse,
    SessionDeviceResponse,
    UserMeResponse,
    UserUpdateRequest,
)
from app.services.auth_service import AuthFlowError, AuthService
from app.services.username_service import ReservedUsernameError, resolve_edited_username

router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger("hungernet.api")
MAX_AVATAR_SIZE = 5 * 1024 * 1024
AVATAR_FORMATS = (
    (b"\x89PNG\r\n\x1a\n", ".png"),
    (b"\xff\xd8\xff", ".jpg"),
    (b"GIF87a", ".gif"),
    (b"GIF89a", ".gif"),
)


def avatar_extension(content: bytes) -> str | None:
    for signature, extension in AVATAR_FORMATS:
        if content.startswith(signature):
            return extension
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return ".webp"
    return None


@router.get("/me", response_model=UserMeResponse)
async def read_current_user(user: User = Depends(get_current_user)) -> UserMeResponse:
    return UserMeResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        profile_visibility=user.profile_visibility,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
    )


@router.patch(
    "/me",
    response_model=UserMeResponse,
    dependencies=[Depends(require_csrf)],
)
async def update_current_user(
    request: Request,
    payload: UserUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserMeResponse:
    updates = payload.model_dump(exclude_unset=True)
    email_changed = "email" in updates and updates["email"] != user.email
    if "username" in updates and updates["username"]:
        try:
            updates["username"] = await resolve_edited_username(
                db,
                updates["username"],
                current_username=user.username,
                user_id=user.id,
            )
        except (ReservedUsernameError, ValueError) as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
    if "email" in updates:
        normalized_email = updates["email"]
        if normalized_email != user.email:
            await require_recent_auth(request, user.id)
            conflict = await db.scalar(
                select(User.id).where(
                    func.lower(User.email) == normalized_email,
                    User.id != user.id,
                )
            )
            if conflict:
                raise HTTPException(status_code=409, detail="Email is already in use")
            updates["email"] = normalized_email
        else:
            updates.pop("email")
    for field, value in updates.items():
        setattr(user, field, value)
    if email_changed:
        db.add(
            AuditEvent(
                actor_user_id=user.id,
                action="user.email_updated",
                target_type="user",
                target_id=user.id,
                details="Account email address updated",
            )
        )
    try:
        await db.commit()
    except IntegrityError as error:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Profile value conflicts with another account") from error
    await db.refresh(user)
    return UserMeResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        profile_visibility=user.profile_visibility,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
    )


@router.post("/me/avatar", dependencies=[Depends(require_csrf)])
async def upload_current_user_avatar(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    content = bytearray()
    async for chunk in request.stream():
        if len(content) + len(chunk) > MAX_AVATAR_SIZE:
            raise HTTPException(status_code=413, detail="Avatar image must be 5 MB or smaller")
        content.extend(chunk)

    extension = avatar_extension(content)
    if extension is None:
        raise HTTPException(status_code=415, detail="Upload a PNG, JPEG, WebP, or GIF image")

    avatar_dir = settings.avatar_storage_dir / "avatars"
    filename = f"{uuid4().hex}{extension}"
    avatar_path = avatar_dir / filename
    try:
        avatar_dir.mkdir(parents=True, exist_ok=True)
        avatar_path.write_bytes(content)
    except OSError as error:
        raise HTTPException(status_code=500, detail="Avatar could not be stored") from error

    previous_url = user.avatar_url
    avatar_url = f"{settings.avatar_public_base_url.rstrip('/')}/media/avatars/{filename}"
    user.avatar_url = avatar_url
    try:
        await db.commit()
    except SQLAlchemyError:
        await db.rollback()
        try:
            avatar_path.unlink(missing_ok=True)
        except OSError:
            logger.exception("Could not remove an uncommitted avatar upload")
        raise

    if previous_url:
        previous_path = previous_url.split("?", 1)[0]
        previous_filename = previous_path.rsplit("/", 1)[-1]
        if (
            previous_path.startswith(
                f"{settings.avatar_public_base_url.rstrip('/')}/media/avatars/"
            )
            and re.fullmatch(r"[a-f0-9]{32}\.(png|jpg|gif|webp)", previous_filename)
            and previous_filename != filename
        ):
            try:
                (avatar_dir / previous_filename).unlink(missing_ok=True)
            except OSError:
                logger.exception("Could not remove a replaced avatar image")
    return {"avatar_url": avatar_url}


@router.get("/me/identities", response_model=list[LinkedIdentityResponse])
async def list_linked_identities(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[LinkedIdentityResponse]:
    identities = await db.scalars(
        select(Identity).where(Identity.user_id == user_id).order_by(Identity.created_at)
    )
    return [
        LinkedIdentityResponse(
            provider=item.provider,
            linked_at=item.created_at,
            provider_email=item.provider_email,
        )
        for item in identities
    ]


@router.post(
    "/me/identities/{provider}/start",
    dependencies=[Depends(require_csrf), Depends(require_recent_auth)],
)
async def start_identity_link(
    provider: str,
    request: Request,
    response: Response,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    provider = provider.lower()
    if provider not in settings.allowed_oauth_providers:
        raise HTTPException(status_code=404, detail="Unsupported OAuth provider")
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        credentials = request.headers.get("authorization", "")
        token = credentials[7:] if credentials.lower().startswith("bearer ") else ""
    claims = verify_session_token(token)
    if claims is None or claims.get("sub") != user_id:
        raise HTTPException(status_code=401, detail="A valid current session is required to link identities")

    redirect_uri = f"{OAUTH_CALLBACK_ENDPOINT.rstrip('/')}/auth/oauth/{provider}/callback"
    return_to = f"{RETURN_ORIGINS[0]}/security"
    try:
        transaction, state, challenge = await AuthService.begin_oauth(
            db,
            provider=provider,
            redirect_uri=redirect_uri,
            return_to=return_to,
            purpose="link",
            user_id=user_id,
            session_id=claims["sid"],
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
    response.set_cookie(
        f"{settings.csrf_cookie_name}_oauth",
        state,
        max_age=600,
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite="lax",
        domain=(
            None
            if is_workers_dev_origin(request.headers.get("origin", ""))
            else NORMAL_SHARED_COOKIE_DOMAIN
        ),
        path=f"{API_ROUTE_PREFIX}/auth/oauth/{provider}/callback",
    )
    return {"authorization_url": url}


@router.delete(
    "/me/identities/{provider}",
    status_code=204,
    dependencies=[Depends(require_csrf), Depends(require_recent_auth)],
)
async def unlink_identity(
    provider: str,
    user: User = Depends(require_permission("platform.profile.update")),
    db: AsyncSession = Depends(get_db),
) -> Response:
    identity = await db.scalar(
        select(Identity).where(Identity.user_id == user.id, Identity.provider == provider.lower())
    )
    if identity is None:
        raise HTTPException(status_code=404, detail="Linked identity not found")
    identity_count = await db.scalar(select(func.count()).select_from(Identity).where(Identity.user_id == user.id))
    if (identity_count or 0) <= 1:
        raise HTTPException(status_code=409, detail="Cannot remove the last sign-in identity")
    db.add(
        AuditEvent(
            actor_user_id=user.id,
            action="identity.unlinked",
            target_type="identity",
            target_id=identity.id,
            details=f"Unlinked provider {identity.provider}",
        )
    )
    await db.delete(identity)
    await db.commit()
    return Response(status_code=204)


@router.get("/me/sessions", response_model=list[SessionDeviceResponse])
async def list_sessions(
    request: Request,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[SessionDeviceResponse]:
    token = request.cookies.get(settings.session_cookie_name)
    claims = verify_session_token(token) if token else None
    sessions = await db.scalars(
        select(Session)
        .where(Session.user_id == user_id, Session.revoked_at.is_(None))
        .order_by(Session.last_seen_at.desc())
    )
    return [
        SessionDeviceResponse(
            id=item.id,
            device_label=item.device_label,
            created_at=item.created_at,
            last_seen_at=item.last_seen_at,
            expires_at=item.expires_at,
            current=bool(claims and claims.get("sid") == item.id),
        )
        for item in sessions
    ]


@router.delete("/me/sessions/{session_id}", status_code=204, dependencies=[Depends(require_csrf)])
async def revoke_session(
    session_id: str,
    request: Request,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> Response:
    session = await db.scalar(
        select(Session).where(Session.id == session_id, Session.user_id == user_id, Session.revoked_at.is_(None))
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    session.revoked_at = datetime.now(UTC)
    await db.commit()
    response = Response(status_code=204)
    current_token = request.cookies.get(settings.session_cookie_name)
    current_claims = verify_session_token(current_token) if current_token else None
    if current_claims and current_claims.get("sid") == session_id:
        cookie_domain = (
            None
            if is_workers_dev_origin(request.headers.get("origin", ""))
            else NORMAL_SHARED_COOKIE_DOMAIN
        )
        response.delete_cookie(settings.session_cookie_name, domain=cookie_domain, path="/")
    return response


@router.delete("/me/sessions", status_code=204, dependencies=[Depends(require_csrf)])
async def revoke_other_sessions(
    request: Request,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> Response:
    current_token = request.cookies.get(settings.session_cookie_name)
    current_claims = verify_session_token(current_token) if current_token else None
    statement = select(Session).where(Session.user_id == user_id, Session.revoked_at.is_(None))
    sessions = await db.scalars(statement)
    now = datetime.now(UTC)
    for session in sessions:
        if not current_claims or session.id != current_claims.get("sid"):
            session.revoked_at = now
    await db.commit()
    return Response(status_code=204)


@router.get("/{username}", response_model=PublicProfileResponse)
async def get_user_by_username(username: str, db: AsyncSession = Depends(get_db)) -> PublicProfileResponse:
    user = await db.scalar(select(User).where(func.lower(User.username) == username.lower()))
    if user is None or user.profile_visibility != "public" or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return PublicProfileResponse(
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
    )
