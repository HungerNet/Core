from __future__ import annotations

import re
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Permission, Role, RolePermission, User

PERMISSION_REGISTRY = {
    "platform.profile.read",
    "platform.profile.update",
    "platform.announcements.read",
    "platform.announcements.manage",
    "platform.admin.users.read",
    "platform.admin.users.update",
    "platform.admin.roles.manage",
    "platform.admin.audit.read",
    "roles.create",
}


def role_identifier(role: Role) -> str:
    if role.key == "platform.member":
        return "member"
    if re.fullmatch(r"[a-z0-9]+", role.key):
        return role.key
    slug = re.sub(r"[^a-z0-9]", "", role.key.lower()) or "role"
    suffix = re.sub(r"[^a-z0-9]", "", role.id.lower())[:8]
    return f"{slug}{suffix}"


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
                user_permission.expires_at is None or user_permission.expires_at > datetime.now(UTC)
            ):
                permissions.add(user_permission.permission)

        return sorted(permissions)

    @staticmethod
    def has_permission(user: User | None, node: str) -> bool:
        return node in PermissionService.effective_permissions(user)

    @staticmethod
    async def seed_member_role(db: AsyncSession) -> Role:
        role = await db.scalar(
            select(Role).where(Role.key == "member").options(selectinload(Role.permissions))
        )
        if role is None:
            role = await db.scalar(
                select(Role)
                .where(Role.key == "platform.member")
                .options(selectinload(Role.permissions))
            )
            if role is not None:
                role.key = "member"
        if role is None:
            role = Role(
                key="member",
                name="Member",
                description="Standard platform account",
                color="#7ef9d2",
                is_system=True,
                permissions=[],
            )
            db.add(role)
            await db.flush()
        else:
            role.permissions.clear()
        superuser_role = await db.scalar(
            select(Role).where(Role.key == "superuser").options(selectinload(Role.permissions))
        )
        if superuser_role is None:
            superuser_role = Role(
                key="superuser",
                name="Superuser",
                description="All platform permission nodes",
                color="#ffbf69",
                is_system=True,
                permissions=[],
            )
            db.add(superuser_role)
            await db.flush()

        permission_rows = list((await db.scalars(select(Permission))).all())
        existing = {row.key for row in permission_rows}
        for key in sorted(PERMISSION_REGISTRY - existing):
            permission = Permission(key=key, description=f"Allows {key} actions")
            db.add(permission)
            await db.flush()
            permission_rows.append(permission)

        assigned = {
            row.permission_id
            for row in (
                await db.scalars(
                    select(RolePermission).where(RolePermission.role_id == superuser_role.id)
                )
            ).all()
        }
        for permission in permission_rows:
            if permission.id not in assigned:
                superuser_role.permissions.append(permission)
        await db.flush()
        return role
