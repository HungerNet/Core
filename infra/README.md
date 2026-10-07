# VPS Deployment

`docker-compose.yml` runs PostgreSQL, Redis-backed rate limiting, the FastAPI image, a one-shot Alembic migration service, and Caddy. Caddy provisions TLS for `api.hungernet.dev`, which proxies to the API. PostgreSQL, Redis, and FastAPI are not published directly on host ports.

## First-time VPS setup

1. Install Docker Engine and the Docker Compose v2 plugin. Use a dedicated deploy account with Docker access and SSH key authentication.
2. Create an otherwise empty deployment directory and an environment file outside the repository, readable only by the deploy account (for example `/etc/hungernet/backend.env`). Do not commit or generate that file from this repository.
3. Configure DNS A/AAAA records for both API hostnames to the VPS. Allow inbound TCP 80/443 and UDP 443 for Caddy; restrict SSH to trusted management sources. PostgreSQL has no published port.
4. Populate the protected environment file with the variables listed below. `DATABASE_URL` must use the Compose service host `db`; URL-encode reserved characters in its password.
5. Configure the GitHub `production-api` environment secrets. Pushes to `main` build and push an immutable SHA-tagged image, then use SSH to deploy it. The VPS must be able to read the private GHCR package through the read-only package token.

Required GitHub environment secrets:

- `DEPLOY_HOST`, `DEPLOY_USER`, and absolute `DEPLOY_PATH`
- `VPS_ENV_FILE`, the absolute path to the protected VPS environment file
- `DEPLOY_SSH_PRIVATE_KEY` and pinned `DEPLOY_KNOWN_HOSTS`
- `GHCR_DEPLOY_USER` and `GHCR_DEPLOY_TOKEN` with `read:packages`

Required VPS environment variables (configure in the protected VPS environment file, not in source control):

- `POSTGRES_PASSWORD`, `DATABASE_URL`, and `JWT_SECRET` (at least 32 random characters)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `DISCORD_CLIENT_ID`, and `DISCORD_CLIENT_SECRET`
- Optional `POSTGRES_DB`, `POSTGRES_USER`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRY_MINUTES`, `SESSION_EXPIRY_DAYS`, and rate-limit values

Use the same password in `POSTGRES_PASSWORD` and `DATABASE_URL`. The database URL must use `postgresql+asyncpg://...@db:5432/...`; URL-encode any reserved characters in the password. CORS and OAuth return origins are hardcoded exact lists in backend source. Redeploy the API after changing those lists.

## Deployment sequence

The workflow runs on every push to `main` and can also be started manually. It builds and pushes `ghcr.io/<owner>/<repo>/api:<commit-sha>`, logs the VPS into GHCR, copies the Compose/Caddy files, pulls the image, runs `alembic upgrade head`, then restarts and waits for the API health check. A failed migration prevents the API restart.

OAuth provider credentials are validated when `ENVIRONMENT=production`; unset or empty OAuth secrets fail startup. The Redis service is private to the Compose network and is required for rate-limited request handling.
