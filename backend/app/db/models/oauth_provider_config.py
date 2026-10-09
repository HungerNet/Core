from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OAuthProviderConfig(Base):
    __tablename__ = "oauth_provider_configs"

    provider: Mapped[str] = mapped_column(String(20), primary_key=True)
    client_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    encrypted_client_secret: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
