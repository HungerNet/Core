"""Add rotating application refresh tokens.

Revision ID: 20261007_app_refresh
Revises: 20261007_local_auth
Create Date: 2026-10-07
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "20261007_app_refresh"
down_revision = "20261006_role_colors"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "app_refresh_tokens",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("session_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("client_id", sa.String(length=48), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_app_refresh_tokens_session_id", "app_refresh_tokens", ["session_id"])
    op.create_index("ix_app_refresh_tokens_user_id", "app_refresh_tokens", ["user_id"])
    op.create_index("ix_app_refresh_tokens_client_id", "app_refresh_tokens", ["client_id"])
    op.create_index("ix_app_refresh_tokens_token_hash", "app_refresh_tokens", ["token_hash"])


def downgrade() -> None:
    op.drop_index("ix_app_refresh_tokens_token_hash", table_name="app_refresh_tokens")
    op.drop_index("ix_app_refresh_tokens_client_id", table_name="app_refresh_tokens")
    op.drop_index("ix_app_refresh_tokens_user_id", table_name="app_refresh_tokens")
    op.drop_index("ix_app_refresh_tokens_session_id", table_name="app_refresh_tokens")
    op.drop_table("app_refresh_tokens")