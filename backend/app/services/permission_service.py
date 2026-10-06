from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Permission, Role, RolePermission, User

PERMISSION_REGISTRY = {
    "platform.profile.read",
    "platform.profile.update",
    "platform.projects.read",
    "platform.projects.create",
    "platform.projects.manage",
    "platform.announcements.read",
    "platform.announcements.manage",
    "platform.admin.users.read",
    "platform.admin.users.update",
    "platform.admin.roles.manage",
    "platform.admin.audit.read",
}


class PermissionService:
    @staticmethod
    def effective_permissions(user: User | None) -> list[str]:
        if user is None or not user.is_active:
            return []

        permissions: set[str] = set()
        if user.is_superuser:
            return sorted(PERMISSION_REGISTRY)

        for role in user.roles:
            for permission in role.permissions:
                if permission.key in PERMISSION_REGISTRY:
                    permissions.add(permission.key)

        for user_permission in user.permissions:
            if user_permission.permission in PERMISSION_REGISTRY and (
                user_permission.expires_at is None
                or user_permission.expires_at > datetime.now(UTC)
            ):
                permissions.add(user_permission.permission)

        return sorted(permissions)

    @staticmethod
    def has_permission(user: User | None, node: str) -> bool:
        return node in PermissionService.effective_permissions(user)

    @staticmethod
    async def seed_member_role(db: AsyncSession) -> Role:
        role = await db.scalar(
            select(Role).where(Role.key == "platform.member").options(selectinload(Role.permissions))
        )
        if role is None:
            role = Role(key="platform.member", name="Member", description="Standard platform account", is_system=True)
            db.add(role)
            await db.flush()

        member_nodes = {
            "platform.profile.read",
            "platform.profile.update",
            "platform.projects.read",
            "platform.projects.create",
        }
        permission_rows = list((await db.scalars(select(Permission).where(Permission.key.in_(member_nodes)))).all())
        existing = {row.key for row in permission_rows}
        for key in sorted(member_nodes - existing):
            permission = Permission(key=key, description=f"Allows {key} actions")
            db.add(permission)
            await db.flush()
            permission_rows.append(permission)
            existing.add(key)

        assigned = {
            row.permission_id
            for row in (await db.scalars(select(RolePermission).where(RolePermission.role_id == role.id))).all()
        }
        for permission in permission_rows:
            if permission.id not in assigned:
                db.add(RolePermission(role_id=role.id, permission_id=permission.id))
        await db.flush()
        return role
