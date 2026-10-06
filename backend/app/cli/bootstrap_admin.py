from __future__ import annotations

import asyncio

import typer
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import AuditEvent, Permission, Role, RolePermission, User, UserRole
from app.db.session import SessionLocal

app = typer.Typer(no_args_is_help=True, help="HungerNet platform administration commands.")

ADMIN_ROLE_KEY = "platform.admin"
ADMIN_PERMISSIONS = (
    "platform.admin.users.read",
    "platform.admin.users.update",
    "platform.admin.roles.manage",
    "platform.admin.audit.read",
)


@app.callback()
def main() -> None:
    """Manage HungerNet platform administration tasks."""


async def _promote_user(username: str, reason: str) -> str:
    async with SessionLocal() as db:
        async with db.begin():
            user = await db.scalar(select(User).where(User.username == username).with_for_update())
            if user is None:
                return "missing"

            role = await db.scalar(select(Role).where(Role.key == ADMIN_ROLE_KEY).with_for_update())
            if role is not None:
                assignment = await db.scalar(
                    select(UserRole.user_id).where(
                        UserRole.user_id == user.id,
                        UserRole.role_id == role.id,
                    )
                )
                if assignment is not None:
                    return "already_assigned"
            else:
                role = Role(
                    key=ADMIN_ROLE_KEY,
                    name="Platform Admin",
                    description="Administrative access to HungerNet platform tools.",
                    is_system=True,
                )
                db.add(role)
                await db.flush()

            permission_rows = list(
                (
                    await db.scalars(
                        select(Permission).where(Permission.key.in_(ADMIN_PERMISSIONS))
                    )
                ).all()
            )
            permissions_by_key = {permission.key: permission for permission in permission_rows}
            for permission_key in ADMIN_PERMISSIONS:
                if permission_key not in permissions_by_key:
                    permission = Permission(
                        key=permission_key,
                        description=f"Allows {permission_key} actions",
                    )
                    db.add(permission)
                    permissions_by_key[permission_key] = permission

            await db.flush()
            assigned_permission_ids = set(
                (
                    await db.scalars(
                        select(RolePermission.permission_id).where(
                            RolePermission.role_id == role.id
                        )
                    )
                ).all()
            )
            for permission in permissions_by_key.values():
                if permission.id not in assigned_permission_ids:
                    db.add(RolePermission(role_id=role.id, permission_id=permission.id))

            db.add(UserRole(user_id=user.id, role_id=role.id))
            db.add(
                AuditEvent(
                    actor_user_id=None,
                    action="role.assigned",
                    target_type="user",
                    target_id=user.id,
                    details=f"role={ADMIN_ROLE_KEY}; reason={reason}; source=cli",
                )
            )

        return "promoted"


@app.command()
def promote(
    username: str = typer.Argument(help="Username of the account to promote."),
    reason: str = typer.Option(
        ...,
        prompt="Reason for granting platform administrator access",
    ),
) -> None:
    """Grant the platform.admin role to an existing user."""
    reason = reason.strip()
    if not 3 <= len(reason) <= 255:
        typer.echo("Reason must be between 3 and 255 characters.", err=True)
        raise typer.Exit(code=2)

    typer.confirm(f"Promote @{username} to Platform Admin?", abort=True)

    try:
        result = asyncio.run(_promote_user(username, reason))
    except SQLAlchemyError as error:
        detail = getattr(error, "orig", error)
        typer.echo(
            f"Failed to promote user because the database operation failed: {detail}",
            err=True,
        )
        raise typer.Exit(code=1) from None

    if result == "missing":
        typer.echo(f"No user found with username '{username}'.", err=True)
        raise typer.Exit(code=1)
    if result == "already_assigned":
        typer.echo(f"@{username} already has the {ADMIN_ROLE_KEY} role; no changes made.")
        return

    typer.echo(f"Granted the {ADMIN_ROLE_KEY} role to @{username}.")