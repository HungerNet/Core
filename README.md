# HungerNet Core

This repository is the source of truth for the HungerNet platform: shared TypeScript packages, the Core account/admin apps, and the FastAPI backend. The older site folders are read-only examples and are not the active product implementation.

## Project layout

- Shared packages: `packages/ui`, `packages/styles`, `packages/types`, `packages/auth`, `packages/api-client`
- Frontend apps: `apps/account`, `apps/admin`, `apps/hungernet`, `apps/hungersmp`, `apps/ifamished`, `apps/optifineforfabric`
- Backend: `backend/` with FastAPI, SQLAlchemy, OAuth integrations, permissions, sessions, projects, and announcements
- Infrastructure: `infra/docker-compose.yml`, `infra/Caddyfile`, and deployment scripts

## Required tools

- Node.js 22.x
- pnpm 10.x via Corepack
- Python 3.12.x
- `uv` for Python dependency management
- Docker Engine + Docker Compose v2

## One-time setup

```bash
cd /Core
pnpm install

JWT_SECRET=
cd backend
uv sync
```


If `uv` is not installed yet:
AVATAR_STORAGE_DIR=media
AVATAR_PUBLIC_BASE_URL=https://api.hungernet.dev

SUPERUSER_ID=hungernet
SUPERUSER_USERNAME=HungerNet
SUPERUSER_PASSWORD=HungerAdmin#8456123

```

POSTGRES_PASSWORD=


Set `JWT_SECRET` to a unique random value of at least 32 characters and set `POSTGRES_PASSWORD` before starting the backend. Replace the example superuser password before deploying; backend settings load this root `.env` file directly.
### Frontend apps

Run an app individually:

```bash
cd /Core
pnpm --filter @hungernet/account dev
pnpm --filter @hungernet/admin dev
pnpm --filter @hungernet/hungernet-site dev
pnpm --filter @hungernet/hungersmp dev
pnpm --filter @hungernet/ifamished dev
pnpm --filter @hungernet/optifineforfabric dev
```

Run all frontend apps together:

```bash
cd /Core
pnpm dev:frontend
```

Run backend + frontend together:

```bash
cd /Core
pnpm dev:all
```

### Local database and Redis

```bash
cd /Core
docker compose -f infra/docker-compose.yml up --build
```

This starts Postgres and Redis for the backend. Do not put production secrets in this file. Keep them in a local untracked `.env` or a real secret manager.

## Environment model

- Use `.env.example` as the only checked-in placeholder template.
- Copy it to a local untracked `.env` and fill in your local developer values.
- Never commit `.env`, provider secrets, JWT secrets, session secrets, or database credentials.
- In production, use a real secret manager or deployment environment variables.

## Required environment variables

### Root `.env` configuration

```env
DATABASE_URL=postgresql+asyncpg://hungernet:local-development-only@localhost:5432/hungernet

JWT_SECRET=
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRY_MINUTES=15
SESSION_EXPIRY_DAYS=90

REDIS_URL=redis://localhost:6379/0
VITE_API_PROXY_TARGET=http://localhost:8000
AVATAR_STORAGE_DIR=media
AVATAR_PUBLIC_BASE_URL=https://api.hungernet.dev

SUPERUSER_ID=hungernet
SUPERUSER_USERNAME=HungerNet
SUPERUSER_PASSWORD=HungerAdmin#8456123

POSTGRES_DB=hungernet
POSTGRES_USER=hungernet
POSTGRES_PASSWORD=
```

Set `JWT_SECRET` to a unique random value of at least 32 characters and set `POSTGRES_PASSWORD` before starting the backend. Replace the example superuser password before deploying; backend settings load this root `.env` file directly.

Production API and Account hosts are selected from the current site origin using hardcoded domain constants. Local Vite servers proxy `/api/v1` to `VITE_API_PROXY_TARGET` (default `http://localhost:8000`); Worker deployments retain their configured upstream API origin. Backend CORS, return origins, and OAuth callbacks are fixed in source.

The account app supports local sign-in/sign-up, authenticator MFA, password changes, and linked Google, GitHub, Discord, and Microsoft identities. SSO credentials are tested and managed from the admin app; provider and MFA secrets are encrypted at rest using a key derived from `JWT_SECRET`. Keep that secret stable or re-encrypt stored secrets before rotating it. MFA-enforcing roles and superusers must complete authenticator setup before receiving a session.

## Publishing and deployment

### Backend deployment

1. Populate environment variables in a secure deployment environment or secret store.
2. Run database migrations before the API starts:

```bash
cd /Core/backend
uv run alembic upgrade head
```

3. Build the backend image or deploy via your CI pipeline.
4. Expose only the reverse proxy or load balancer, not PostgreSQL or Redis directly.

### Frontend deployment

Use Cloudflare Pages or another static host for each app. Configure each one with its own build command and output directory:

- `@hungernet/account` → `apps/account/dist`
- `@hungernet/admin` → `apps/admin/dist`
- `@hungernet/hungernet-site` → `apps/hungernet/dist`
- `@hungernet/hungersmp` → `apps/hungersmp/dist`
- `@hungernet/ifamished` → `apps/ifamished/dist`
- `@hungernet/optifineforfabric` → `apps/optifineforfabric/dist`

Example for the account app:

- Build command: `pnpm --filter @hungernet/account build`
- Output directory: `apps/account/dist`

API and Account hosts are selected from the current origin using hardcoded source constants; no build-time URL setting is needed.

## Validation and release sanity checks

Run the canonical checks before publishing:

```bash
cd /Core
pnpm backend:test
pnpm lint
pnpm typecheck
pnpm build
```

This is the minimum verification gate for the monorepo.

## Security rules

- Never publish secrets in Git, Dockerfiles, logs, or build artifacts.
- Keep `.env` ignored and untracked.
- Use exact production CORS and return origins; the constrained `*.millered001.workers.dev` pattern is also supported.
- Worker preview OAuth callbacks are limited to `/auth/callback`; keep other callback URLs exact.
- Keep JWT secrets, provider secrets, and session cookies outside version control.

See the backend instructions in [backend/README.md](backend/README.md) and the deployment details in [infra/README.md](infra/README.md).
