"""Require MFA for protected roles and protect stored authenticator seeds.

Revision ID: 20261008_role_mfa
Revises: 20261008_username_identity
Create Date: 2026-10-08
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op
from app.core.security import encrypt_totp_secret, hash_totp_secret

revision = "20261008_role_mfa"
down_revision = "20261008_username_identity"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    op.add_column(
        "roles",
        sa.Column("requires_mfa", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("users", sa.Column("totp_secret_hash", sa.String(length=64), nullable=True))

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "totp_secret",
            existing_type=sa.String(length=64),
            type_=sa.String(length=255),
            existing_nullable=True,
        )

    for row in connection.execute(
        sa.text("SELECT id, totp_secret FROM users WHERE totp_secret IS NOT NULL")
    ).mappings():
        secret = row["totp_secret"]
        if not secret.startswith("fernet:v1:"):
            connection.execute(
                sa.text(
                    "UPDATE users SET totp_secret = :encrypted, totp_secret_hash = :secret_hash "
                    "WHERE id = :id"
                ),
                {
                    "id": row["id"],
                    "encrypted": encrypt_totp_secret(secret),
                    "secret_hash": hash_totp_secret(secret),
                },
            )

    connection.execute(
        sa.text("UPDATE roles SET requires_mfa = :required WHERE key = :key"),
        {"required": True, "key": "superuser"},
    )


def downgrade() -> None:
    raise RuntimeError(
        "This migration protects MFA seed material and cannot be safely downgraded."
    )
