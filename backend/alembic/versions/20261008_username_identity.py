"""Normalize usernames and ensure display names exist.

Revision ID: 20261008_username_identity
Revises: 20261008_retire_project_permissions
Create Date: 2026-10-08
"""

from __future__ import annotations

import hashlib
import re
import secrets

import sqlalchemy as sa

from alembic import op

revision = "20261008_username_identity"
down_revision = "20261008_retire_project_permissions"
branch_labels = None
depends_on = None


def _base_username(value: str) -> str:
    base = re.sub(r"[^a-z0-9_]", "", value.lower().replace("-", "_"))[:59]
    return base or "user"


def upgrade() -> None:
    connection = op.get_bind()
    columns = {column["name"] for column in sa.inspect(connection).get_columns("users")}
    if "display_name" not in columns:
        op.add_column("users", sa.Column("display_name", sa.String(length=120), nullable=True))

    rows = connection.execute(
        sa.text("SELECT id, username, display_name FROM users ORDER BY id")
    ).mappings().all()

    original_names = {str(row["username"]) for row in rows}
    temporary_names: set[str] = set()
    for row in rows:
        digest = hashlib.sha256(str(row["id"]).encode()).hexdigest()[:32]
        temporary = f"legacy_{digest}"
        while temporary in original_names or temporary in temporary_names:
            temporary = f"legacy_{hashlib.sha256(temporary.encode()).hexdigest()[:32]}"
        temporary_names.add(temporary)
        connection.execute(
            sa.text("UPDATE users SET username = :username WHERE id = :id"),
            {"username": temporary, "id": row["id"]},
        )
        if row["display_name"] is None or not str(row["display_name"]).strip():
            display_name = str(row["username"] or "User")[:120]
            connection.execute(
                sa.text("UPDATE users SET display_name = :display_name WHERE id = :id"),
                {"display_name": display_name, "id": row["id"]},
            )

    used: set[str] = set()
    for row in rows:
        base = _base_username(str(row["username"] or ""))
        username = base
        if username in used:
            for _ in range(10000):
                username = f"{base}#{secrets.randbelow(10000):04d}"
                if username not in used:
                    break
            else:
                raise RuntimeError(f"Could not create a unique username for user {row['id']}")
        used.add(username)
        connection.execute(
            sa.text("UPDATE users SET username = :username WHERE id = :id"),
            {"username": username, "id": row["id"]},
        )

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "display_name",
            existing_type=sa.String(length=120),
            nullable=False,
        )
        batch_op.alter_column(
            "username",
            existing_type=sa.String(length=64),
            type_=sa.String(length=69),
            existing_nullable=False,
        )


def downgrade() -> None:
    # display_name may have existed before this migration, so it is retained.
    pass