from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_pkce_pair,
    generate_session_token,
    hash_password,
    hash_token,
    validate_password,
)
from app.db.models import AuditEvent, Identity, OAuthTransaction, Session, User, UserRole
from app.integrations.oauth import OAuthIdentity
from app.services.permission_service import PermissionService
from app.services.username_service import resolve_new_username


class AuthFlowError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class AuthService:
    @staticmethod
    async def register_local_user(
        db: AsyncSession,
        *,
        email: str,
        display_name: str,
        password: str,
        username: str | None = None,
    ) -> tuple[User, str | None]:
        validate_password(password)
        existing = await db.scalar(select(User).where(func.lower(User.email) == email))
        if existing is not None:
            raise AuthFlowError("account_exists", "Email is already registered", 409)

        username = await resolve_new_username(db, username, display_name)
        user = User(
            id=str(uuid4()),
            username=username,
            email=email,
            display_name=display_name,
            password_hash=hash_password(password),
            totp_secret=None,
            totp_secret_hash=None,
            totp_enabled=False,
        )
        db.add(user)
        member_role = await PermissionService.seed_member_role(db)
        await db.flush()
        db.add(UserRole(user_id=user.id, role_id=member_role.id))
        db.add(
            AuditEvent(
                actor_user_id=user.id,
                action="user.created",
                target_type="user",
                target_id=user.id,
                details="Created with email and password",
            )
        )
        await db.commit()
        await db.refresh(user)
        return user, None

    @staticmethod
    async def begin_oauth(
        db: AsyncSession,
        *,
        provider: str,
        redirect_uri: str,
        return_to: str,
        purpose: str = "login",
        user_id: str | None = None,
        session_id: str | None = None,
    ) -> tuple[OAuthTransaction, str, str]:
        verifier, challenge = create_pkce_pair()
        state = secrets.token_urlsafe(32)
        nonce = secrets.token_urlsafe(32)
        transaction = OAuthTransaction(
            state_hash=hash_token(state),
            provider=provider,
            redirect_uri=redirect_uri,
            return_to=return_to,
            code_verifier=verifier,
            nonce=nonce,
            purpose=purpose,
            user_id=user_id,
            session_id=session_id,
            expires_at=datetime.now(UTC) + timedelta(minutes=10),
        )
        db.add(transaction)
        await db.commit()
        return transaction, state, challenge

    @staticmethod
    async def consume_oauth_transaction(
        db: AsyncSession,
        *,
        provider: str,
        state: str,
    ) -> OAuthTransaction:
        now = datetime.now(UTC)
        transaction = await db.scalar(
            select(OAuthTransaction)
            .where(
                OAuthTransaction.state_hash == hash_token(state),
                OAuthTransaction.provider == provider,
                OAuthTransaction.consumed_at.is_(None),
                OAuthTransaction.expires_at > now,
            )
            .with_for_update()
        )
        if transaction is None:
            raise AuthFlowError("invalid_oauth_state", "OAuth state is invalid or expired")
        transaction.consumed_at = now
        await db.commit()
        return transaction

    @staticmethod
    async def resolve_identity(
        db: AsyncSession,
        *,
        provider: str,
        identity_data: OAuthIdentity,
        purpose: str = "login",
        linking_user_id: str | None = None,
    ) -> User:
        identity = await db.scalar(
            select(Identity).where(
                Identity.provider == provider,
                Identity.provider_subject == identity_data.provider_subject,
            )
        )
        now = datetime.now(UTC)

        if purpose == "link":
            if not linking_user_id:
                raise AuthFlowError("link_session_required", "Sign in before linking an identity", 401)
            user = await db.get(User, linking_user_id)
            if user is None or not user.is_active:
                raise AuthFlowError("user_unavailable", "Account is unavailable", 401)
            if identity and identity.user_id != user.id:
                raise AuthFlowError("identity_already_linked", "This identity belongs to another account", 409)
            if identity is None:
                identity_id = str(uuid4())
                db.add(
                    Identity(
                        id=identity_id,
                        user_id=user.id,
                        provider=provider,
                        provider_subject=identity_data.provider_subject,
                        provider_email=identity_data.email,
                        avatar_url=identity_data.avatar_url,
                        last_login_at=now,
                    )
                )
            else:
                identity_id = identity.id
                identity.last_login_at = now
            db.add(
                AuditEvent(
                    actor_user_id=user.id,
                    action="identity.linked",
                    target_type="identity",
                    target_id=identity_id,
                    details=f"Linked provider {provider}",
                )
            )
            await db.commit()
            return user

        if identity is not None:
            user = await db.get(User, identity.user_id)
            if user is None or not user.is_active:
                raise AuthFlowError("user_unavailable", "Account is unavailable", 401)
            identity.last_login_at = now
            await db.commit()
            return user

        normalized_email = identity_data.email.lower() if identity_data.email else None
        if normalized_email:
            existing_user = await db.scalar(
                select(User).where(func.lower(User.email) == normalized_email)
            )
            if existing_user is not None:
                raise AuthFlowError(
                    "identity_link_required",
                    "Sign in with the existing identity before linking this provider",
                    409,
                )

        username = await resolve_new_username(db, None, identity_data.display_name)

        user = User(
            id=str(uuid4()),
            username=username,
            email=normalized_email,
            display_name=identity_data.display_name[:120],
        )
        db.add(user)
        db.add(
            Identity(
                user_id=user.id,
                provider=provider,
                provider_subject=identity_data.provider_subject,
                provider_email=normalized_email,
                avatar_url=identity_data.avatar_url,
                last_login_at=now,
            )
        )
        member_role = await PermissionService.seed_member_role(db)
        await db.flush()
        db.add(UserRole(user_id=user.id, role_id=member_role.id))
        db.add(
            AuditEvent(
                actor_user_id=user.id,
                action="user.created",
                target_type="user",
                target_id=user.id,
                details=f"Created from {provider} identity",
            )
        )
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def issue_session(
        db: AsyncSession,
        *,
        user: User,
        device_label: str | None = None,
    ) -> tuple[str, Session]:
        now = datetime.now(UTC)
        session_id = str(uuid4())
        expires_at = now + timedelta(days=settings.session_expiry_days)
        token = generate_session_token(
            user.id,
            session_id,
            expires_minutes=settings.session_expiry_days * 24 * 60,
        )
        db_session = Session(
            id=session_id,
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=expires_at,
            last_seen_at=now,
            device_label=device_label[:160] if device_label else None,
        )
        db.add(db_session)
        await db.commit()
        return token, db_session
