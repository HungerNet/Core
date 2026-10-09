from __future__ import annotations

import asyncio
import re
from datetime import UTC, datetime

import typer
from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import (
    encrypt_totp_secret,
    hash_password,
    hash_totp_secret,
    new_totp_secret,
    validate_password,
)
from app.db.models import AppRefreshToken, AuditEvent, Role, Session, User
from app.db.session import SessionLocal
from app.services.permission_service import PermissionService

app = typer.Typer(no_args_is_help=True, help="HungerNet superuser setup.")


@app.callback()
def main() -> None:
    """Manage the configured HungerNet superuser."""


async def _configure_superuser(
    user_id: str,
    username: str,
    password: str,
    secret: str,
) -> None:
    async with SessionLocal() as db:
        async with db.begin():
            user = await db.scalar(
                select(User)
                .where(User.id == user_id)
                .options(selectinload(User.roles))
                .with_for_update()
            )
            conflicting_user = await db.scalar(
                select(User.id).where(User.username == username, User.id != user_id)
            )
            if conflicting_user is not None:
                raise ValueError("SUPERUSER_USERNAME is already assigned to another account")

            await PermissionService.seed_member_role(db)
            role = await db.scalar(select(Role).where(Role.key == "superuser").with_for_update())
            if role is None:
                raise RuntimeError("The superuser role could not be initialized")
            role.requires_mfa = True

            is_new_user = user is None
            if user is None:
                user = User(
                    id=user_id,
                    username=username,
                    display_name=username,
                    roles=[role],
                )
                db.add(user)
                await db.flush()
            user.username = username
            user.display_name = username
            user.password_hash = hash_password(password)
            user.totp_secret = encrypt_totp_secret(secret)
            user.totp_secret_hash = hash_totp_secret(secret)
            user.totp_enabled = True
            user.is_active = True
            user.is_superuser = True
            if not is_new_user:
                user.roles = [role]
            await db.execute(
                update(Session)
                .where(Session.user_id == user_id, Session.revoked_at.is_(None))
                .values(revoked_at=datetime.now(UTC))
            )
            await db.execute(
                update(AppRefreshToken)
                .where(
                    AppRefreshToken.user_id == user_id,
                    AppRefreshToken.revoked_at.is_(None),
                )
                .values(revoked_at=datetime.now(UTC))
            )
            db.add(
                AuditEvent(
                    actor_user_id=None,
                    action="superuser.configured",
                    target_type="user",
                    target_id=user_id,
                    details="Superuser credentials and OTP seed rotated through CLI",
                )
            )


@app.command("setup-superuser")
def setup_superuser() -> None:
    """Create or rotate the configured superuser and print a new OTP seed once."""
    required = {
        "SUPERUSER_ID": settings.superuser_id,
        "SUPERUSER_USERNAME": settings.superuser_username,
        "SUPERUSER_PASSWORD": (
            settings.superuser_password.get_secret_value()
            if settings.superuser_password is not None
            else None
        ),
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        typer.echo(f"Missing required environment variables: {', '.join(missing)}", err=True)
        raise typer.Exit(code=2)

    user_id = required["SUPERUSER_ID"]
    username = required["SUPERUSER_USERNAME"]
    password = required["SUPERUSER_PASSWORD"]
    if user_id is None or len(user_id) > 36:
        typer.echo("SUPERUSER_ID must contain at most 36 characters.", err=True)
        raise typer.Exit(code=2)
    if username is None or not re.fullmatch(r"[a-z0-9_]{1,64}", username):
        typer.echo("SUPERUSER_USERNAME must use lowercase letters, numbers, and underscores.", err=True)
        raise typer.Exit(code=2)
    if password is None:
        raise typer.Exit(code=2)
    try:
        validate_password(password)
    except ValueError as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(code=2) from None

    secret = new_totp_secret()
    try:
        asyncio.run(_configure_superuser(user_id, username, password, secret))
    except (SQLAlchemyError, ValueError, RuntimeError) as error:
        typer.echo(f"Could not configure the superuser: {error}", err=True)
        raise typer.Exit(code=1) from None

    typer.echo(f"Superuser @{username} is ready. Scan this OTP seed now; it will not be shown again:")
    typer.echo(secret)
