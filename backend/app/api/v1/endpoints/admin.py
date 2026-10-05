from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, get_current_user_id, get_db, require_csrf, require_permission
from app.db.models import AuditEvent, Permission, Role, Session, User
from app.schemas.admin import (
    AdminUserResponse,
    AuditEventResponse,
    RoleAssignmentRequest,
    RoleCreateRequest,
    RoleResponse,
    UserStatusUpdateRequest,
)
from app.services.permission_service import PERMISSION_REGISTRY

router = APIRouter(prefix="/admin", tags=["admin"])


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
    roles = await db.scalars(select(Role).options(selectinload(Role.permissions)).order_by(Role.key))
    return [
        RoleResponse(
            id=role.id,
            key=role.key,
            name=role.name,
            description=role.description,
            is_system=role.is_system,
            permissions=sorted(permission.key for permission in role.permissions),
        )
        for role in roles
    ]


@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user(
    user_id: str,
    _: User = Depends(require_permission("platform.admin.users.read")),
    db: AsyncSession = Depends(get_db),
) -> AdminUserResponse:
    user = await db.scalar(
        select(User).where(User.id == user_id).options(selectinload(User.roles))
    )
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return AdminUserResponse(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        status="active" if user.is_active else "disabled",
        roles=[role.name for role in user.roles],
    )


@router.post(
    "/roles",
    response_model=RoleResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_csrf), Depends(require_permission("platform.admin.roles.manage"))],
)
async def create_role(
    payload: RoleCreateRequest,
    actor: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RoleResponse:
    if any(key not in PERMISSION_REGISTRY for key in payload.permission_keys):
        raise HTTPException(status_code=422, detail="Unknown permission node")
    if await db.scalar(select(Role.id).where(Role.key == payload.key)):
        raise HTTPException(status_code=409, detail="Role key already exists")
    permissions = list(
        (
            await db.scalars(select(Permission).where(Permission.key.in_(payload.permission_keys)))
        ).all()
    ) if payload.permission_keys else []
    existing = {permission.key for permission in permissions}
    for key in payload.permission_keys:
        if key not in existing:
            permission = Permission(key=key, description=f"Allows {key} actions")
            db.add(permission)
            permissions.append(permission)
    role = Role(key=payload.key, name=payload.name, description=payload.description, is_system=False)
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
        id=role.id,
        key=role.key,
        name=role.name,
        description=role.description,
        is_system=role.is_system,
        permissions=sorted(item.key for item in permissions),
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
        .options(selectinload(User.roles).selectinload(Role.permissions), selectinload(User.permissions))
    )
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    from app.services.permission_service import PermissionService

    return {"permissions": PermissionService.effective_permissions(user)}


@router.post(
    "/users/{user_id}/roles/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_csrf), Depends(require_permission("platform.admin.roles.manage"))],
)
async def assign_role(
    user_id: str,
    role_id: str,
    payload: RoleAssignmentRequest,
    actor: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    user = await db.scalar(select(User).where(User.id == user_id).options(selectinload(User.roles)))
    role = await db.get(Role, role_id)
    if user is None or role is None:
        raise HTTPException(status_code=404, detail="User or role not found")
    if role not in user.roles:
        user.roles.append(role)
    db.add(
        AuditEvent(
            actor_user_id=actor.id,
            action="role.assigned",
            target_type="user",
            target_id=user.id,
            details=f"Assigned {role.key}: {payload.reason}",
        )
    )
    await db.commit()


@router.delete(
    "/users/{user_id}/roles/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_csrf), Depends(require_permission("platform.admin.roles.manage"))],
)
async def revoke_role(
    user_id: str,
    role_id: str,
    payload: RoleAssignmentRequest,
    actor: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    user = await db.scalar(select(User).where(User.id == user_id).options(selectinload(User.roles)))
    role = await db.get(Role, role_id)
    if user is None or role is None:
        raise HTTPException(status_code=404, detail="User or role not found")
    if role.is_system:
        raise HTTPException(status_code=409, detail="System roles cannot be removed")
    if role not in user.roles:
        return
    user.roles.remove(role)
    db.add(
        AuditEvent(
            actor_user_id=actor.id,
            action="role.revoked",
            target_type="user",
            target_id=user.id,
            details=f"Revoked {role.key}: {payload.reason}",
        )
    )
    await db.commit()


@router.patch(
    "/users/{user_id}/status",
    response_model=AdminUserResponse,
    dependencies=[Depends(require_csrf), Depends(require_permission("platform.admin.users.update"))],
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
        raise HTTPException(status_code=409, detail="Administrators cannot disable their own account")
    if user.is_superuser and not payload.active:
        active_admins = await db.scalar(select(func.count()).select_from(User).where(User.is_superuser.is_(True), User.is_active.is_(True))) or 0
        if active_admins <= 1:
            raise HTTPException(status_code=409, detail="Cannot disable the last active administrator")
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
            details=f"active={payload.active}: {payload.reason}",
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
