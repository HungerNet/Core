# HungerNet Platform API

This is the FastAPI backend for the Core platform. It includes async SQLAlchemy models, OAuth login flows, profile/session management, permission enforcement, admin endpoints, project and announcement APIs, logging middleware, and security headers.

## Profiles, avatars, and roles

- `GET /api/v1/public/users/{username}` returns public profile details, role badges, and online status derived from an unexpired session seen in the last five minutes.
- `POST /api/v1/users/me/avatar` accepts raw PNG, JPEG, WebP, or GIF bytes (maximum 5 MB), requires the authenticated session/CSRF flow, and returns the stored avatar URL.
- Set `AVATAR_STORAGE_DIR` to persistent storage and `AVATAR_PUBLIC_BASE_URL` to the API origin. Docker Compose mounts the persistent `avatar_data` volume at the configured storage directory.
- The `member` role has no permission nodes. `superuser` has every node in `PERMISSION_REGISTRY`; the `roles.create` node specifically gates role creation. Role IDs are lowercase alphanumeric strings and role colors are `#RRGGBB`.
- `requires_mfa` on a role enforces authenticator verification at sign-in. Superusers always require MFA. Authenticator seeds are encrypted at rest and accompanied by a one-way hash; encryption is required because TOTP verification must reproduce time-based codes.
- Local passwords must be at least 12 characters, include a symbol, and not match the built-in common-password blacklist. Breach-list checks are not enabled.
- `SUPERUSER_ID`, `SUPERUSER_USERNAME`, and `SUPERUSER_PASSWORD` configure CLI provisioning. Run `uv run python -m app.cli setup-superuser` to create or rotate the superuser's password and OTP seed. The seed is printed once per run; rerunning rotates it and invalidates existing sessions. The CLI normalizes the username to lowercase.
- MFA and admin-managed OAuth credentials are encrypted using a key derived from `JWT_SECRET`. Keep `JWT_SECRET` stable or re-encrypt stored secrets before rotating it.
- Microsoft, Google, GitHub, and Discord credentials are configured in the admin SSO settings after a successful provider check; provider credentials are not read from environment variables.
- Optional MFA enrollment and password changes are available in the account app. MFA is enforced for superusers and roles marked `requires_mfa`.

Run `uv run alembic upgrade head` before deploying so the default roles, permissions, and role color column are available.

## Local setup

```bash
cd /Core
cp .env.example .env
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

To run the local database and Redis services:

```bash
cd /Core
docker compose -f infra/docker-compose.yml up --build
```

## Required secrets and configuration

Set all production values in a secure environment file outside the repository. The repo contains only placeholders.

Required environment variables include:

- `DATABASE_URL`
- `JWT_SECRET` (32+ random characters)
- `REDIS_URL`

`SESSION_COOKIE_SECURE=true` and `SESSION_COOKIE_SAME_SITE=lax` are secure defaults and cannot be disabled. The backend always runs in production mode; these settings are not deployment environment switches.

Example local values are in [../.env.example](../.env.example). Do not commit a real `.env` or production secret file.

## Common backend commands

```bash
cd /Core/backend
uv run pytest -q
uv run alembic upgrade head
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Deployment notes

- Keep PostgreSQL and Redis private to the Docker network or a private subnet.
- Publish only the reverse proxy or Cloudflare entry point.
- CORS and OAuth return origins are fixed in backend source and accept only the listed exact app domains.
- Run migrations before deploys and fail the release if the migration does not complete.
- In production, set `docs_url=None` and `redoc_url=None` unless public interactive API docs are intentionally desired.

## Security rules

- Never put OAuth client secrets in Git or a checked-in `.env` file.
- Never log bearer tokens, cookies, provider codes, session identifiers, or emails unless explicitly redacted.
- Restrict return paths and authorization callbacks to the exact allowlists in backend source.
- App authorization uses short-lived, one-use PKCE codes; app tokens are limited to the public profile `userinfo` endpoint.
- Normal-domain sessions use the hardcoded `.hungernet.dev` cookie domain; Workers.dev sessions use host-only cookies.
- Enforce permission checks in backend routers and services instead of trusting browser state.
- Keep an untracked local `.env` for development only; do not reuse it in production.
