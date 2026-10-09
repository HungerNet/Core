from __future__ import annotations

import re
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import (
    get_current_user,
    get_db,
    require_csrf,
    require_permission,
)
from app.core.security import encrypt_secret
from app.db.models import (
    Announcement,
    AppRefreshToken,
    AuditEvent,
    OAuthProviderConfig,
    OAuthTransaction,
    Permission,
    Project,
    Role,
    Session,
    User,
    UserRole,
)
from app.integrations.oauth import (
    OAuthProviderError,
    load_provider_config,
    provider_config_metadata,
    verify_provider_credentials,
)
from app.schemas.admin import (
    AdminUserDetailResponse,
    AdminUserResponse,
    AdminUserUpdateRequest,
    AuditEventResponse,
    OAuthProviderConfigRequest,
    OAuthProviderConfigResponse,
    RoleAssignmentRequest,
    RoleCreateRequest,
    RoleResponse,
    RoleUpdateRequest,
    UserStatusUpdateRequest,
)
from app.services.permission_service import PERMISSION_REGISTRY, role_identifier
from app.services.username_service import ReservedUsernameError, resolve_edited_username

router = APIRouter(prefix="/admin", tags=["admin"])


def avatar_storage_file(avatar_url: str | None) -> Path | None:
    if not avatar_url:
        return None
    path = urlsplit(avatar_url).path
    match = re.search(r"/media/avatars/([a-f0-9]{32}\.(?:png|jpg|gif|webp))$", path)
    if match is None:
        return None
    return Path(settings.avatar_storage_dir) / "avatars" / match.group(1)


async def find_role(db: AsyncSession, identifier: str) -> Role | None:
    role = await db.scalar(select(Role).where((Role.id == identifier) | (Role.key == identifier)))
    if role is not None:
        return role
    roles = await db.scalars(select(Role))
    return next(
        (candidate for candidate in roles if role_identifier(candidate) == identifier),
        None,
    )


async def revoke_user_sessions(db: AsyncSession, user_ids: list[str]) -> None:
    if not user_ids:
        return
    revoked_at = datetime.now(UTC)
    await db.execute(
        update(Session)
        .where(Session.user_id.in_(user_ids), Session.revoked_at.is_(None))
        .values(revoked_at=revoked_at)
    )
    await db.execute(
        update(AppRefreshToken)
        .where(
            AppRefreshToken.user_id.in_(user_ids),
            AppRefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=revoked_at)
    )


@router.get("/users")
async def list_users(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0, le=100000),
    _: User = Depends(require_permission("platform.admin.users.read")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    query = select(User).options(selectinload(User.roles)).order_by(User.created_at.desc())
    users = await db.scalars(query.offset(offset).limit(limit))
    total = await db.scalar(select(func.count()).select_from(User)) or 0
    return {
        "items": [
            AdminUserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                display_name=user.display_name,
                status="active" if user.is_active else "disabled",
                roles=[role.name for role in user.roles],
            ).model_dump()
            for user in users
        ],
        "limit": limit,
        "offset": offset,
        "total": total,
    }


@router.get("/roles", response_model=list[RoleResponse])
async def list_roles(
    _: User = Depends(require_permission("platform.admin.roles.manage")),
    db: AsyncSession = Depends(get_db),
) -> list[RoleResponse]:
    roles = await db.scalars(
        select(Role).options(selectinload(Role.permissions)).order_by(Role.key)
    )
    return [
        RoleResponse(
            id=role_identifier(role),
            key=role.key,
            name=role.name,
            description=role.description,
            color=role.color,
            is_system=role.is_system,
            requires_mfa=role.requires_mfa,
            permissions=sorted(permission.key for permission in role.permissions),
        )
        for role in roles
    ]


@router.get("/users/{user_id}", response_model=AdminUserDetailResponse)
async def get_user(
    user_id: str,
    _: User = Depends(require_permission("platform.admin.users.read")),
    db: AsyncSession = Depends(get_db),
) -> AdminUserDetailResponse:
    user = await db.scalar(
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.roles).selectinload(Role.permissions),
            selectinload(User.permissions),
            selectinload(User.identities),
            selectinload(User.sessions),
            selectinload(User.projects),
        )
    )
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    from app.services.permission_service import PermissionService

    avatar_file = avatar_storage_file(user.avatar_url)
    avatar_exists = bool(avatar_file and avatar_file.is_file())
    avatar_bytes = avatar_file.stat().st_size if avatar_exists and avatar_file else 0
    return AdminUserDetailResponse(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        status="active" if user.is_active else "disabled",
        roles=[role.name for role in user.roles],
        email=user.email,
        avatar_url=user.avatar_url,
        bio=user.bio,
        profile_visibility=user.profile_visibility,
        is_superuser=user.is_superuser,
        totp_enabled=user.totp_enabled,
        created_at=user.created_at,
        updated_at=user.updated_at,
        identities=user.identities,
        sessions=user.sessions,
        permissions=PermissionService.effective_permissions(user),
        project_count=len(user.projects),
        storage={
            "avatar_filename": avatar_file.name if avatar_file else None,
            "avatar_exists": avatar_exists,
            "avatar_bytes": avatar_bytes,
        },
    )


@router.patch(
    "/users/{user_id}",
    response_model=AdminUserDetailResponse,
    dependencies=[
        Depends(require_csrf),
        Depends(require_permission("platform.admin.users.update")),
    ],
)
async def update_user(
    user_id: str,
    payload: AdminUserUpdateRequest,
    actor: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AdminUserDetailResponse:
    user = await db.scalar(select(User).where(User.id == user_id).options(selectinload(User.roles)))
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    updates = payload.model_dump(exclude_unset=True)
    username = updates.get("username")
    if username is not None and username != user.username:
        try:
            updates["username"] = await resolve_edited_username(
                db,
                username,
                current_username=user.username,
                user_id=user.id,
            )
        except (ReservedUsernameError, ValueError) as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
    if "email" in updates and updates["email"] is not None:
        conflict = await db.scalar(
            select(User.id).where(func.lower(User.email) == updates["email"], User.id != user.id)
        )
        if conflict:
            raise HTTPException(status_code=409, detail="Email is already in use")

    if (
        updates.get("is_superuser") is False
        and (user.is_superuser or any(role.key == "superuser" for role in user.roles))
        and user.is_active
    ):
        active_admins = (
            await db.scalar(
                select(func.count())
                .select_from(User)
                .where(
                    User.id != user.id,
                    User.is_active.is_(True),
                    (User.is_superuser.is_(True) | User.roles.any(Role.key == "superuser")),
                )
            )
            or 0
        )
        if active_admins == 0:
            raise HTTPException(
                status_code=409, detail="Cannot remove the last active administrator"
            )

    if updates.get("totp_enabled") is True and not user.totp_secret:
        raise HTTPException(
            status_code=409, detail="The user must enroll in MFA before it can be enabled"
        )
    if updates.get("totp_enabled") is False:
        user.totp_secret = None
    if updates.get("is_superuser") is False:
        user.roles = [role for role in user.roles if role.key != "superuser"]
    if updates.get("is_superuser") is True and not user.is_superuser:
        await revoke_user_sessions(db, [user.id])

    for field, value in updates.items():
        setattr(user, field, value)
    db.add(
        AuditEvent(
            actor_user_id=actor.id,
            action="user.updated",
            target_type="user",
            target_id=user.id,
            details="Updated account settings",
        )
    )
    try:
        await db.commit()
    except IntegrityError as error:
        await db.rollback()
        raise HTTPException(
            status_code=409, detail="Account settings conflict with another user"
        ) from error
    return await get_user(user.id, actor, db)


@router.post(
    "/roles",
    response_model=RoleResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_csrf), Depends(require_permission("roles.create"))],
)
async def create_role(
    payload: RoleCreateRequest,
    actor: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RoleResponse:
    permission_keys = list(dict.fromkeys(payload.permission_keys))
    if any(key not in PERMISSION_REGISTRY for key in permission_keys):
        raise HTTPException(status_code=422, detail="Unknown permission node")
    if await db.scalar(select(Role.id).where(Role.key == payload.key)):
        raise HTTPException(status_code=409, detail="Role key already exists")
    permissions = (
        list(
            (await db.scalars(select(Permission).where(Permission.key.in_(permission_keys)))).all()
        )
        if permission_keys
        else []
    )
    existing = {permission.key for permission in permissions}
    for key in permission_keys:
        if key not in existing:
            permission = Permission(key=key, description=f"Allows {key} actions")
            db.add(permission)
            permissions.append(permission)
    role = Role(
        key=payload.key,
        name=payload.name,
        description=payload.description,
        color=payload.color.lower(),
        is_system=False,
        requires_mfa=payload.requires_mfa,
    )
    role.permissions = permissions
    db.add(role)
    await db.flush()
    db.add(
        AuditEvent(
            actor_user_id=actor.id,
            action="role.created",
            target_type="role",
            target_id=role.id,
            details=f"Created role {role.key}",
        )
    )
    await db.commit()
    return RoleResponse(
        id=role_identifier(role),
        key=role.key,
        name=role.name,
        description=role.description,
        color=role.color,
        is_system=role.is_system,
        requires_mfa=role.requires_mfa,
        permissions=sorted(item.key for item in permissions),
    )


@router.patch(
    "/roles/{role_id}",
    response_model=RoleResponse,
    dependencies=[
        Depends(require_csrf),
        Depends(require_permission("platform.admin.roles.manage")),
    ],
)
async def update_role(
    role_id: str,
    payload: RoleUpdateRequest,
    actor: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RoleResponse:
    role = await find_role(db, role_id)
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.is_system:
        raise HTTPException(status_code=409, detail="System roles cannot be edited")

    updates = payload.model_dump(exclude_unset=True)
    permission_keys = updates.pop("permission_keys", None)
    enforce_mfa = updates.get("requires_mfa") is True and not role.requires_mfa
    if permission_keys is not None:
        permission_keys = list(dict.fromkeys(permission_keys))
        if any(key not in PERMISSION_REGISTRY for key in permission_keys):
            raise HTTPException(status_code=422, detail="Unknown permission node")
        permissions = (
            list(
                (
                    await db.scalars(select(Permission).where(Permission.key.in_(permission_keys)))
                ).all()
            )
            if permission_keys
            else []
        )
        existing = {permission.key for permission in permissions}
        for key in permission_keys:
            if key not in existing:
                permission = Permission(key=key, description=f"Allows {key} actions")
                db.add(permission)
                permissions.append(permission)
        role.permissions = permissions

    if "color" in updates and updates["color"] is not None:
        updates["color"] = updates["color"].lower()
    for field, value in updates.items():
        setattr(role, field, value)
    if enforce_mfa:
        user_ids = list(
            (
                await db.scalars(
                    select(UserRole.user_id).where(UserRole.role_id == role.id)
                )
            ).all()
        )
        await revoke_user_sessions(db, user_ids)
    db.add(
        AuditEvent(
            actor_user_id=actor.id,
            action="role.updated",
            target_type="role",
            target_id=role.id,
            details=f"Updated role {role.key}",
        )
    )
    await db.commit()
    await db.refresh(role)
    await db.refresh(role, attribute_names=["permissions"])
    return RoleResponse(
        id=role_identifier(role),
        key=role.key,
        name=role.name,
        description=role.description,
        color=role.color,
        is_system=role.is_system,
        requires_mfa=role.requires_mfa,
        permissions=sorted(permission.key for permission in role.permissions),
    )


@router.get("/permissions")
async def list_permissions(
    _: User = Depends(require_permission("platform.admin.roles.manage")),
) -> dict[str, list[str]]:
    return {"items": sorted(PERMISSION_REGISTRY)}


@router.get("/users/{user_id}/permissions")
async def user_permissions(
    user_id: str,
    _: User = Depends(require_permission("platform.admin.users.read")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, list[str]]:
    user = await db.scalar(
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.roles).selectinload(Role.permissions), selectinload(User.permissions)
        )
    )
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    from app.services.permission_service import PermissionService

    return {"permissions": PermissionService.effective_permissions(user)}


@router.post(
    "/users/{user_id}/roles/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[
        Depends(require_csrf),
        Depends(require_permission("platform.admin.roles.manage")),
    ],
)
async def assign_role(
    user_id: str,
    role_id: str,
    payload: RoleAssignmentRequest | None = None,
    actor: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    user = await db.scalar(select(User).where(User.id == user_id).options(selectinload(User.roles)))
    role = await find_role(db, role_id)
    if user is None or role is None:
        raise HTTPException(status_code=404, detail="User or role not found")
    if role not in user.roles:
        user.roles.append(role)
        if role.requires_mfa:
            await revoke_user_sessions(db, [user.id])
    reason = payload.reason.strip() if payload and payload.reason else None
    db.add(
        AuditEvent(
            actor_user_id=actor.id,
            action="role.assigned",
            target_type="user",
            target_id=user.id,
            details=f"Assigned {role.key}" + (f": {reason}" if reason else ""),
        )
    )
    await db.commit()


@router.delete(
    "/users/{user_id}/roles/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[
        Depends(require_csrf),
        Depends(require_permission("platform.admin.roles.manage")),
    ],
)
async def revoke_role(
    user_id: str,
    role_id: str,
    payload: RoleAssignmentRequest | None = None,
    actor: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    user = await db.scalar(select(User).where(User.id == user_id).options(selectinload(User.roles)))
    role = await find_role(db, role_id)
    if user is None or role is None:
        raise HTTPException(status_code=404, detail="User or role not found")
    if role.is_system and role.key != "superuser":
        raise HTTPException(status_code=409, detail="System roles cannot be removed")
    if role.key == "superuser":
        if user.id == actor.id:
            raise HTTPException(
                status_code=409, detail="Administrators cannot remove their own superuser role"
            )
        if user.is_active:
            active_admins = (
                await db.scalar(
                    select(func.count())
                    .select_from(User)
                    .where(
                        User.id != user.id,
                        User.is_active.is_(True),
                        (User.is_superuser.is_(True) | User.roles.any(Role.key == "superuser")),
                    )
                )
                or 0
            )
            if active_admins == 0:
                raise HTTPException(
                    status_code=409, detail="Cannot remove the last active administrator"
                )
    if role not in user.roles:
        return
    user.roles.remove(role)
    reason = payload.reason.strip() if payload and payload.reason else None
    db.add(
        AuditEvent(
            actor_user_id=actor.id,
            action="role.revoked",
            target_type="user",
            target_id=user.id,
            details=f"Revoked {role.key}" + (f": {reason}" if reason else ""),
        )
    )
    await db.commit()


@router.patch(
    "/users/{user_id}/status",
    response_model=AdminUserResponse,
    dependencies=[
        Depends(require_csrf),
        Depends(require_permission("platform.admin.users.update")),
    ],
)
async def update_user_status(
    user_id: str,
    payload: UserStatusUpdateRequest,
    actor: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AdminUserResponse:
    user = await db.scalar(select(User).where(User.id == user_id).options(selectinload(User.roles)))
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == actor.id and not payload.active:
        raise HTTPException(
            status_code=409, detail="Administrators cannot disable their own account"
        )
    has_superuser_role = any(role.key == "superuser" for role in user.roles)
    if (user.is_superuser or has_superuser_role) and not payload.active:
        active_admins = (
            await db.scalar(
                select(func.count())
                .select_from(User)
                .where(
                    User.is_active.is_(True),
                    (User.is_superuser.is_(True) | User.roles.any(Role.key == "superuser")),
                )
            )
            or 0
        )
        if active_admins <= 1:
            raise HTTPException(
                status_code=409, detail="Cannot disable the last active administrator"
            )
    user.is_active = payload.active
    if not payload.active:
        sessions = await db.scalars(
            select(Session).where(Session.user_id == user.id, Session.revoked_at.is_(None))
        )
        now = datetime.now(UTC)
        for session in sessions:
            session.revoked_at = now
    db.add(
        AuditEvent(
            actor_user_id=actor.id,
            action="user.status_updated",
            target_type="user",
            target_id=user.id,
            details=f"active={payload.active}"
            + (f": {payload.reason.strip()}" if payload.reason and payload.reason.strip() else ""),
        )
    )
    await db.commit()
    return AdminUserResponse(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        status="active" if user.is_active else "disabled",
        roles=[role.name for role in user.roles],
    )


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[
        Depends(require_csrf),
        Depends(require_permission("platform.admin.users.update")),
    ],
)
async def delete_user(
    user_id: str,
    actor: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    user = await db.scalar(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.roles), selectinload(User.projects))
    )
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == actor.id:
        raise HTTPException(
            status_code=409, detail="Administrators cannot delete their own account"
        )

    is_admin = user.is_superuser or any(role.key == "superuser" for role in user.roles)
    if user.is_active and is_admin:
        active_admins = (
            await db.scalar(
                select(func.count())
                .select_from(User)
                .where(
                    User.id != user.id,
                    User.is_active.is_(True),
                    (User.is_superuser.is_(True) | User.roles.any(Role.key == "superuser")),
                )
            )
            or 0
        )
        if active_admins == 0:
            raise HTTPException(
                status_code=409, detail="Cannot delete the last active administrator"
            )

    avatar_file = avatar_storage_file(user.avatar_url)
    project_slugs = list(
        (await db.scalars(select(Project.slug).where(Project.user_id == user.id))).all()
    )
    if project_slugs:
        await db.execute(
            update(Announcement)
            .where(Announcement.project_slug.in_(project_slugs))
            .values(project_slug=None)
        )

    await db.execute(delete(AppRefreshToken).where(AppRefreshToken.user_id == user.id))
    await db.execute(delete(OAuthTransaction).where(OAuthTransaction.user_id == user.id))
    await db.execute(
        update(AuditEvent).where(AuditEvent.actor_user_id == user.id).values(actor_user_id=None)
    )
    db.add(
        AuditEvent(
            actor_user_id=actor.id,
            action="user.deleted",
            target_type="user",
            target_id=user.id,
            details=f"Deleted @{user.username}",
        )
    )
    await db.delete(user)
    await db.commit()
    if avatar_file:
        try:
            avatar_file.unlink(missing_ok=True)
        except OSError:
            pass


@router.get("/audit-events", response_model=list[AuditEventResponse])
async def list_audit_events(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0, le=100000),
    _: User = Depends(require_permission("platform.admin.audit.read")),
    db: AsyncSession = Depends(get_db),
) -> list[AuditEventResponse]:
    events = await db.scalars(
        select(AuditEvent).order_by(AuditEvent.created_at.desc()).offset(offset).limit(limit)
    )
    return [AuditEventResponse.model_validate(event, from_attributes=True) for event in events]


@router.get("/sso/providers", response_model=list[OAuthProviderConfigResponse])
async def list_sso_providers(
    _: User = Depends(require_permission("platform.admin.roles.manage")),
    db: AsyncSession = Depends(get_db),
) -> list[OAuthProviderConfigResponse]:
    supported = {"google", "github", "discord", "microsoft"}
    providers = list(
        dict.fromkeys(
            provider.lower()
            for provider in settings.allowed_oauth_providers
            if provider.lower() in supported
        )
    )
    results = []
    for provider in providers:
        stored = await db.get(OAuthProviderConfig, provider)
        config = await load_provider_config(provider, db)
        results.append(
            OAuthProviderConfigResponse(
                provider=provider,
                enabled=config is not None,
                client_id=stored.client_id if stored else (
                    config.client_id if config else None
                ),
                updated_at=stored.updated_at if stored else None,
            )
        )
    return results


@router.post(
    "/sso/providers/test",
    dependencies=[
        Depends(require_csrf),
        Depends(require_permission("platform.admin.roles.manage")),
    ],
)
async def test_sso_provider(
    payload: OAuthProviderConfigRequest,
) -> dict[str, bool]:
    provider = payload.provider.lower()
    if provider not in {item.lower() for item in settings.allowed_oauth_providers}:
        raise HTTPException(status_code=422, detail="OAuth provider is not allowed")
    try:
        await verify_provider_credentials(provider, payload.client_id, payload.client_secret)
    except OAuthProviderError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return {"verified": True}


@router.post(
    "/sso/providers",
    response_model=OAuthProviderConfigResponse,
    dependencies=[
        Depends(require_csrf),
        Depends(require_permission("platform.admin.roles.manage")),
    ],
)
async def save_sso_provider(
    payload: OAuthProviderConfigRequest,
    actor: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OAuthProviderConfigResponse:
    provider = payload.provider.lower()
    if provider not in {item.lower() for item in settings.allowed_oauth_providers}:
        raise HTTPException(status_code=422, detail="OAuth provider is not allowed")
    try:
        await verify_provider_credentials(provider, payload.client_id, payload.client_secret)
    except OAuthProviderError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    config = await db.get(OAuthProviderConfig, provider)
    if config is None:
        config = OAuthProviderConfig(provider=provider)
        db.add(config)
    config.client_id = payload.client_id.strip()
    config.encrypted_client_secret = encrypt_secret(payload.client_secret)
    config.enabled = True
    db.add(
        AuditEvent(
            actor_user_id=actor.id,
            action="sso.provider.configured",
            target_type="oauth_provider",
            target_id=provider,
            details="OAuth provider credentials verified and saved",
        )
    )
    await db.commit()
    await db.refresh(config)
    return OAuthProviderConfigResponse(
        provider=provider,
        enabled=True,
        client_id=config.client_id,
        updated_at=config.updated_at,
    )


@router.delete(
    "/sso/providers/{provider}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[
        Depends(require_csrf),
        Depends(require_permission("platform.admin.roles.manage")),
    ],
)
async def disable_sso_provider(
    provider: str,
    actor: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    provider = provider.lower()
    try:
        provider_config_metadata(provider)
    except OAuthProviderError as error:
        raise HTTPException(status_code=404, detail="Unsupported OAuth provider") from error
    if provider not in {item.lower() for item in settings.allowed_oauth_providers}:
        raise HTTPException(status_code=404, detail="Unsupported OAuth provider")
    config = await db.get(OAuthProviderConfig, provider)
    if config is None:
        config = OAuthProviderConfig(provider=provider, enabled=False)
        db.add(config)
    else:
        config.enabled = False
        config.client_id = None
        config.encrypted_client_secret = None
    db.add(
        AuditEvent(
            actor_user_id=actor.id,
            action="sso.provider.disabled",
            target_type="oauth_provider",
            target_id=provider,
            details="OAuth provider credentials removed",
        )
    )
    await db.commit()
