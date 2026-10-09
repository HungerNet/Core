"""Store verified OAuth provider configuration for admin-managed SSO.

Revision ID: 20261009_oauth_provider_configs
Revises: 20261008_role_mfa
Create Date: 2026-10-09
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "20261009_oauth_provider_configs"
down_revision = "20261008_role_mfa"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "oauth_provider_configs",
        sa.Column("provider", sa.String(length=20), primary_key=True),
        sa.Column("client_id", sa.String(length=255), nullable=True),
        sa.Column("encrypted_client_secret", sa.String(length=1024), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("oauth_provider_configs")
