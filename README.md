# HungerNet Core

This repository is the source of truth for the HungerNet platform: shared TypeScript packages, the Core account/admin apps, and the FastAPI backend. The older site folders are read-only examples and are not the active product implementation.

## Project layout

- Shared packages: `packages/ui`, `packages/styles`, `packages/types`, `packages/auth`, `packages/api-client`
- Frontend apps: `apps/accounts`, `apps/admin`, `apps/hungernet`, `apps/hungersmp`, `apps/ifamished`, `apps/optifineforfabric`
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
corepack enable
pnpm install
cp .env.example .env
cd backend
uv sync
```

If `uv` is not installed yet:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## Local development

### Backend

```bash
cd /Core
pnpm dev:backend
```

This launches the FastAPI app in reload mode on port 8000 using the environment from the local root `.env` file.

### Frontend apps

Run an app individually:

```bash
cd /Core
pnpm --filter @hungernet/accounts dev
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

### Root `.env` for local dev

```env
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://hungernet:local-development-only@localhost:5432/hungernet
JWT_SECRET=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRY_MINUTES=15
SESSION_EXPIRY_DAYS=30
REDIS_URL=redis://localhost:6379/0
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAME_SITE=lax

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

POSTGRES_DB=hungernet
POSTGRES_USER=hungernet
POSTGRES_PASSWORD=local-development-only
```

Frontend API and Accounts hosts are selected from the current site origin using hardcoded domain constants. Backend CORS, return origins, and OAuth callbacks are fixed in source; no domain environment settings are required.

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

- `@hungernet/accounts` → `apps/accounts/dist`
- `@hungernet/admin` → `apps/admin/dist`
- `@hungernet/hungernet-site` → `apps/hungernet/dist`
- `@hungernet/hungersmp` → `apps/hungersmp/dist`
- `@hungernet/ifamished` → `apps/ifamished/dist`
- `@hungernet/optifineforfabric` → `apps/optifineforfabric/dist`

Example for the account app:

- Build command: `pnpm --filter @hungernet/accounts build`
- Output directory: `apps/accounts/dist`

API and Accounts hosts are selected from the current origin using hardcoded source constants; no build-time URL setting is needed.

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
