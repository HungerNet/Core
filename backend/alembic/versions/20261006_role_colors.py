"""Add role colors, seed core roles, and add the roles.create permission.

Revision ID: 20261006_role_colors
Revises: 20261007_local_auth
Create Date: 2026-10-06
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import sqlalchemy as sa

from alembic import op

revision = "20261006_role_colors"
down_revision = "20261007_local_auth"
branch_labels = None
depends_on = None

PERMISSION_KEYS = (
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
    "roles.create",
)


def upgrade() -> None:
    op.add_column(
        "roles",
        sa.Column("color", sa.String(length=7), nullable=False, server_default="#7ef9d2"),
    )

    connection = op.get_bind()
    member_id = connection.execute(
        sa.text("SELECT id FROM roles WHERE key = 'member'")
    ).scalar_one_or_none()
    if member_id is None:
        member_id = connection.execute(
            sa.text("SELECT id FROM roles WHERE key = 'platform.member'")
        ).scalar_one_or_none()
        if member_id is not None:
            connection.execute(
                sa.text(
                    "UPDATE roles SET key = 'member', name = 'Member', "
                    "description = 'Standard platform account', "
                    "color = '#7ef9d2', is_system = true "
                    "WHERE id = :id"
                ),
                {"id": member_id},
            )
    if member_id is None:
        member_id = str(uuid4())
        connection.execute(
            sa.text(
                "INSERT INTO roles (id, key, name, description, color, is_system, created_at) "
                "VALUES (:id, 'member', 'Member', 'Standard platform account', "
                "'#7ef9d2', true, :created_at)"
            ),
            {"id": member_id, "created_at": datetime.now(UTC)},
        )
    else:
        connection.execute(
            sa.text(
                "UPDATE roles SET name = 'Member', description = 'Standard platform account', "
                "color = '#7ef9d2', is_system = true WHERE id = :id"
            ),
            {"id": member_id},
        )

    superuser_id = connection.execute(
        sa.text("SELECT id FROM roles WHERE key = 'superuser'")
    ).scalar_one_or_none()
    if superuser_id is None:
        superuser_id = str(uuid4())
        connection.execute(
            sa.text(
                "INSERT INTO roles (id, key, name, description, color, is_system, created_at) "
                "VALUES (:id, 'superuser', 'Superuser', 'All platform permission nodes', "
                "'#ffbf69', true, :created_at)"
            ),
            {"id": superuser_id, "created_at": datetime.now(UTC)},
        )
    else:
        connection.execute(
            sa.text(
                "UPDATE roles SET name = 'Superuser', "
                "description = 'All platform permission nodes', "
                "color = '#ffbf69', is_system = true WHERE id = :id"
            ),
            {"id": superuser_id},
        )

    permission_ids: dict[str, str] = {}
    for key in PERMISSION_KEYS:
        permission_id = connection.execute(
            sa.text("SELECT id FROM permissions WHERE key = :key"), {"key": key}
        ).scalar_one_or_none()
        if permission_id is None:
            permission_id = str(uuid4())
            connection.execute(
                sa.text(
                    "INSERT INTO permissions (id, key, description, created_at) "
                    "VALUES (:id, :key, :description, :created_at)"
                ),
                {
                    "id": permission_id,
                    "key": key,
                    "description": f"Allows {key} actions",
                    "created_at": datetime.now(UTC),
                },
            )
        permission_ids[key] = permission_id

    connection.execute(
        sa.text("DELETE FROM role_permissions WHERE role_id = :role_id"),
        {"role_id": member_id},
    )
    existing_permissions = set(
        connection.execute(
            sa.text("SELECT permission_id FROM role_permissions WHERE role_id = :role_id"),
            {"role_id": superuser_id},
        ).scalars().all()
    )
    for permission_id in permission_ids.values():
        if permission_id not in existing_permissions:
            connection.execute(
                sa.text(
                    "INSERT INTO role_permissions (role_id, permission_id, created_at) "
                    "VALUES (:role_id, :permission_id, :created_at)"
                ),
                {
                    "role_id": superuser_id,
                    "permission_id": permission_id,
                    "created_at": datetime.now(UTC),
                },
            )

    existing_assignments = set(
        connection.execute(sa.text("SELECT user_id, role_id FROM user_roles")).all()
    )
    for user_id, is_superuser in connection.execute(
        sa.text("SELECT id, is_superuser FROM users")
    ).all():
        assignments = [(member_id, True), (superuser_id, bool(is_superuser))]
        for role_id, should_assign in assignments:
            if should_assign and (user_id, role_id) not in existing_assignments:
                connection.execute(
                    sa.text(
                        "INSERT INTO user_roles (user_id, role_id, created_at) "
                        "VALUES (:user_id, :role_id, :created_at)"
                    ),
                    {
                        "user_id": user_id,
                        "role_id": role_id,
                        "created_at": datetime.now(UTC),
                    },
                )


def downgrade() -> None:
    op.drop_column("roles", "color")
