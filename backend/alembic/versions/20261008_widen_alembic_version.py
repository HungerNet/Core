"""Widen Alembic's revision storage column for long revision identifiers.

Revision ID: 20261008_widen_alembic_version
Revises: 20261007_app_refresh
Create Date: 2026-10-08
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "20261008_widen_alembic_version"
down_revision = "20261007_app_refresh"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    columns = sa.inspect(connection).get_columns("alembic_version")
    version_column = next(
        (column for column in columns if column["name"] == "version_num"),
        None,
    )
    if version_column is None:
        raise RuntimeError("alembic_version.version_num does not exist")

    current_type = version_column["type"]
    current_length = getattr(current_type, "length", None)
    if current_length is not None and current_length >= 128:
        return

    if connection.dialect.name == "sqlite":
        with op.batch_alter_table("alembic_version") as batch_op:
            batch_op.alter_column(
                "version_num",
                existing_type=current_type,
                type_=sa.String(length=128),
                existing_nullable=version_column["nullable"],
            )
    else:
        op.alter_column(
            "alembic_version",
            "version_num",
            existing_type=current_type,
            type_=sa.String(length=128),
            existing_nullable=version_column["nullable"],
        )


def downgrade() -> None:
    pass
