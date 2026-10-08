"""Remove retired project management permissions.

Revision ID: 20261008_retire_project_permissions
Revises: 20261008_widen_alembic_version
Create Date: 2026-10-08
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import sqlalchemy as sa

from alembic import op

revision = "20261008_retire_project_permissions"
down_revision = "20261008_widen_alembic_version"
branch_labels = None
depends_on = None

PERMISSION_KEYS = (
    "platform.projects.read",
    "platform.projects.create",
    "platform.projects.manage",
)


def upgrade() -> None:
    connection = op.get_bind()
    for key in PERMISSION_KEYS:
        permission_id = connection.execute(
            sa.text("SELECT id FROM permissions WHERE key = :key"), {"key": key}
        ).scalar_one_or_none()
        if permission_id is None:
            continue
        connection.execute(
            sa.text("DELETE FROM role_permissions WHERE permission_id = :permission_id"),
            {"permission_id": permission_id},
        )
        connection.execute(
            sa.text("DELETE FROM user_permissions WHERE permission = :key"), {"key": key}
        )
        connection.execute(
            sa.text("DELETE FROM permissions WHERE id = :permission_id"),
            {"permission_id": permission_id},
        )


def downgrade() -> None:
    connection = op.get_bind()
    for key in PERMISSION_KEYS:
        exists = connection.execute(
            sa.text("SELECT id FROM permissions WHERE key = :key"), {"key": key}
        ).scalar_one_or_none()
        if exists is None:
            connection.execute(
                sa.text(
                    "INSERT INTO permissions (id, key, description, created_at) "
                    "VALUES (:id, :key, :description, :created_at)"
                ),
                {
                    "id": str(uuid4()),
                    "key": key,
                    "description": f"Allows {key} actions",
                    "created_at": datetime.now(UTC),
                },
            )
