# HungerNet Platform Implementation Plan

## 1. Goal and constraints

Build a shared HungerNet platform in `/Core` that provides reusable React UI, theming, types, authentication, a FastAPI backend, PostgreSQL persistence, permissions, profile/admin APIs, and deployments. Treat `/apps/ifamished.com`, `/apps/hungernet.dev`, `/apps/hungersmp.com`, and `/apps/optifineforfabric.com` as read-only examples. The platform must not require edits to those sites as part of this plan.

All commands below assume the repository root is `/Core`. Adapt only the physical reference paths if this environment mounts `/apps/...` elsewhere. Never run formatters, generators, install commands, or bulk scripts with a reference workspace as their working directory or target.

## 2. Monorepo structure

Create a pnpm/Turborepo JavaScript workspace alongside a Python backend. Keep independently deployable apps separate from shared packages.

```text
Core/
├── apps/
│   ├── web/                       # Shared account/admin portal, React + TypeScript + Vite
│   └── docs/                      # Optional internal platform docs site, only if needed
├── packages/
│   ├── ui/                        # Accessible React components, TypeScript
│   ├── styles/                    # CSS tokens, themes, reset, utility classes
│   ├── types/                     # Shared API and domain TypeScript types
│   ├── auth/                      # Auth context/provider, hooks, route guards
│   ├── api-client/                # Typed fetch client and endpoint methods
│   ├── config-typescript/         # Shared TS compiler settings
│   └── config-eslint/             # Shared lint rules
├── backend/
│   ├── app/
│   │   ├── api/v1/                # Versioned routers and endpoint modules
│   │   ├── core/                  # Settings, security, logging, dependencies
│   │   ├── db/                    # SQLAlchemy session, models, repositories
│   │   ├── schemas/               # Pydantic request/response models
│   │   ├── services/              # Auth, permissions, profiles, admin logic
│   │   ├── integrations/          # Google, GitHub, Discord OIDC/OAuth adapters
│   │   ├── main.py                # FastAPI application factory/entrypoint
│   │   └── tests/
│   ├── alembic/                   # Versioned PostgreSQL migrations
│   ├── pyproject.toml
│   └── Dockerfile
├── infra/
│   ├── compose.yaml               # Local PostgreSQL + API (+ optional proxy)
│   ├── nginx/                     # VPS reverse proxy/TLS configuration
│   └── scripts/                   # Backup, deploy, health-check helpers
├── .github/workflows/             # CI and protected production deployment
├── .env.example                   # Names and safe local defaults only
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
└── plan.md
```

Use stable package names such as `@hungernet/ui`, `@hungernet/styles`, `@hungernet/types`, `@hungernet/auth`, and `@hungernet/api-client`. Add a root README after the initial bootstrap. Keep package dependencies one-directional: `types` has no runtime framework dependency; `styles` is CSS-only; `ui` may depend on `styles`; `api-client` depends on `types`; `auth` depends on `api-client` and `types`; applications compose these packages. The Python service is independently packaged and does not import frontend code.

### Bootstrap commands

```bash
cd /Core
corepack enable
pnpm init
pnpm add -D turbo typescript eslint prettier
mkdir -p apps/web packages/{ui,styles,types,auth,api-client,config-typescript,config-eslint}
mkdir -p backend/app/{api/v1,core,db,schemas,services,integrations,tests} backend/alembic/versions
mkdir -p infra/{nginx,scripts} .github/workflows
```

Configure `pnpm-workspace.yaml` for `apps/*` and `packages/*`, define root scripts (`dev`, `build`, `lint`, `typecheck`, `test`), and configure Turbo task dependencies so package builds precede dependent app builds. Use a lockfile committed to the repository. Pin supported Node and Python versions in project metadata and CI.

## 3. Shared UI system

Implement the shared UI package before migrating consumers. Start with primitives needed by the four reference sites and the account/admin workflows:

- `Button`, `IconButton`, `LinkButton`, `TextInput`, `PasswordInput`, `Select`, `Checkbox`, `Switch`, `FormField`, `Alert`, `Badge`, `Card`, `Dialog`, `Tabs`, `Accordion`, `CopyButton`, `Spinner`, `Skeleton`, `EmptyState`, `Pagination`, and `DataTable`.
- Layout components: `PageShell`, `SiteHeader`, `SiteFooter`, `Container`, `Stack`, and `SectionHeading`.
- Give each component explicit TypeScript props, semantic HTML, keyboard behavior, visible focus states, and accessible names/ARIA state. Prefer native controls where they meet needs.
- Keep brand/site copy, destinations, and data outside generic components. For example, navigation receives typed items; it does not hardcode HungerNet routes.
- Export components and types from a deliberate package entry point. Do not export internal implementation paths as public API.
- Add component tests for keyboard interaction, disabled/loading states, validation semantics, and rendering at narrow viewport widths. Add Storybook only if it will be maintained; it is not a prerequisite for the first release.

First establish a visual baseline from the reference apps: inspect `Navbar`, `Footer`, cards, buttons, accordions, form inputs, page/container classes, and interaction states. Extract reusable behavior, not site-specific branding or accidental implementation details. Preserve each product's distinct identity when consuming the shared package through theme tokens and configuration.

## 4. Shared CSS and theming

In `packages/styles`, define a small token contract using CSS custom properties. Include semantic color roles (`--color-surface`, `--color-text`, `--color-muted`, `--color-border`, `--color-primary`, `--color-danger`, `--color-success`), spacing, typography, radii, shadows, focus ring, and content widths. Provide a restrained reset and component-independent layout utilities; UI component styles belong with the component or in a clearly named shared component stylesheet.

Implement theme entry points such as `themes/hungernet.css`, `themes/ifamished.css`, `themes/hungersmp.css`, and `themes/optifine.css` only where reference-derived consumers require them. A consuming app selects a theme by loading its stylesheet or setting a validated `data-theme` value on the document root. Avoid duplicate theme definitions and avoid global selectors that unexpectedly restyle embedded third-party content.

Use mobile-first responsive rules, reduced-motion support, high-contrast focus indicators, and color contrast checks. Document token names and extension rules. Verify that changing a theme changes semantic values without changing component behavior. Keep the brand palettes in the app/theme layer, not hardcoded into shared components.

## 5. Shared TypeScript types and API contract

Use `packages/types` for frontend domain types and schemas that are safe to expose. Treat backend Pydantic models as the runtime source of truth. Generate or validate TypeScript API types from OpenAPI during CI (for example, export the FastAPI OpenAPI schema and generate into a checked/verified artifact). Avoid maintaining endpoint request/response interfaces independently by hand.

Define at minimum:

- `User`, `PublicProfile`, `ProfileUpdate`, `LinkedIdentity`, and `UserStatus`.
- `PermissionNode`, `RoleSummary`, `EffectivePermissions`, and `AdminAuditEvent`.
- `ApiError`, paginated response metadata, and common ID/date formats.
- Auth state and provider identifiers (`google`, `github`, `discord`) without credentials or provider access tokens.

Use ISO-8601 UTC strings on the wire and parse/format at UI boundaries. Distinguish public profile fields from private account fields. Do not expose database models directly as API contracts. Validate generated OpenAPI/TypeScript consistency in CI and make compatibility changes additive where possible.

## 6. Shared auth provider and API client

Build `packages/api-client` first: a single configurable fetch wrapper with base URL, credentials mode, JSON serialization, request IDs, timeout/abort handling, and normalized error parsing. Keep tokens and cookies out of logs. Use typed methods for auth, current-user, profile, permissions, and admin APIs. The client must distinguish unauthenticated, forbidden, validation, rate-limit, and server failures.

Implement `packages/auth` as a React provider and hooks:

- `AuthProvider` calls `/api/v1/auth/session` during initialization and exposes `status: loading | authenticated | unauthenticated`, current public user, sign-in initiation, sign-out, and refresh.
- `useAuth` reads this state; `RequireAuth` and `RequirePermission` handle loading and unauthorized UI without redirect loops.
- Use same-site, `HttpOnly`, `Secure` cookies for the production session. Do not put access tokens, refresh tokens, passwords, or other secrets in `localStorage`, URLs, analytics, or client logs.
- Protect cookie-authenticated state-changing requests with CSRF defenses (SameSite policy plus CSRF token/origin validation as appropriate). Validate allowed origins and CORS narrowly.
- Provider login links go to backend authorization-start endpoints. The browser never receives a provider client secret.
- Keep logout/revocation behavior explicit, clear the browser session, and invalidate server-side refresh/session state.

Test expired sessions, startup failure, concurrent refresh, logout, blocked routes, and permissions that are absent or stale. Prefer short-lived access state with server-controlled refresh/session rotation; choose cookie session versus JWT only after deployment topology and revocation needs are confirmed. Default to opaque server-side sessions in secure cookies for this first-party web platform; use JWT only when a concrete service-to-service or stateless verification requirement warrants it.

## 7. FastAPI backend architecture

Use FastAPI with Pydantic v2, SQLAlchemy 2 async (or synchronous SQLAlchemy consistently if async driver/operations are not needed), Alembic, and a PostgreSQL driver. Organize the backend into router, schema, service, repository/model, and integration boundaries. Routers should authenticate/authorize, validate input/output, and delegate business logic; they should not contain SQL or provider-specific logic.

Use settings from environment variables with a typed settings class. Keep secrets out of source control. Add structured logs with request IDs and redact authorization headers, cookies, provider codes, email tokens, and passwords. Add health endpoints (`/health/live`, `/health/ready`), startup/shutdown handling, database connection checks, and API version prefix `/api/v1`.

Suggested dependencies: `fastapi`, `uvicorn[standard]`, `pydantic-settings`, `sqlalchemy[asyncio]`, `asyncpg`, `alembic`, `httpx`, an OIDC/OAuth client library with maintained support, and test tools `pytest`, `pytest-asyncio`, `httpx`, and coverage. Confirm library maintenance/security and provider flow support before selecting the OAuth library. Use `uv` for reproducible Python environment management and commit its lockfile.

Define consistent error responses with machine-readable `code`, safe `message`, optional field errors, and request ID. Add rate limits at the reverse proxy and/or application boundary for login, callback, profile mutations, and admin routes. Apply request body limits and security headers at the proxy.

## 8. PostgreSQL schema and migrations

Start with these normalized tables and constraints. Use UUID primary keys (generated by the application or database), UTC timestamps, foreign keys, and indexes on lookup/filter columns.

- `users`: `id`, unique normalized `primary_email` (nullable only if product policy permits), `display_name`, `avatar_url`, `created_at`, `updated_at`, `disabled_at`, and optional profile visibility settings. Do not store provider passwords.
- `identities`: `id`, `user_id`, `provider`, `provider_subject`, optional verified provider email/metadata, `created_at`, `last_login_at`; unique `(provider, provider_subject)`, index `user_id`. Encrypt or minimize any provider tokens; preferably do not persist them unless a documented integration needs them.
- `sessions`: hashed opaque session identifier, `user_id`, creation/expiry/last-seen/revocation timestamps, and safe device metadata. Never store the raw browser session cookie value.
- `roles`: stable unique `key`, display name, description, system-managed flag.
- `permissions`: stable unique node string, description, scope metadata if required.
- `user_roles`: `user_id`, `role_id`, optional grantor and timestamps; composite uniqueness.
- `role_permissions`: `role_id`, `permission_id`; composite uniqueness.
- `user_permissions`: optional direct allow/deny grant model with grantor, reason, expiry, and audit metadata. Add only if role composition cannot satisfy the initial needs.
- `admin_audit_events`: actor, action, target type/id, timestamp, request ID, reason, and structured before/after metadata with sensitive data redacted. Append-only for application roles.
- Optional `oauth_transactions`: hashed state/nonce/PKCE verifier, provider, return path allowlist value, creation/expiry/consumed timestamp; remove consumed/expired rows periodically.

Use Alembic migrations only; never modify production schemas manually. Add indexes based on actual query paths and use uniqueness constraints to prevent duplicate identity linking. Migrations should be reversible when practical, and data migrations should be separate from schema migrations where operations are large. Test migrations against an empty database and the previous released schema.

Initial commands:

```bash
cd /Core/backend
uv init
uv add fastapi 'uvicorn[standard]' pydantic-settings 'sqlalchemy[asyncio]' asyncpg alembic httpx
uv add --dev pytest pytest-asyncio coverage ruff mypy
alembic init alembic
```

## 9. OAuth2 / OpenID Connect SSO

Implement Google and GitHub identity login and Discord login using the provider-supported OAuth/OIDC flow and scopes. Do not assume all providers expose equivalent OIDC behavior: use OIDC discovery/ID-token validation where supported and the provider's documented user API for identity where necessary. Treat the provider's immutable subject/user ID as identity key; never identify an account by email alone.

For each provider:

1. Register separate local/staging/production OAuth applications and configure exact callback URLs.
2. Store client ID/secret in the deployment secret manager; configure allowed scopes minimally (identity and email only when required).
3. Start authorization server-side with cryptographically random `state`, `nonce` when OIDC applies, and PKCE where supported. Persist a short-lived transaction record and bind it to the browser.
4. On callback, verify state, issuer, audience, signature using provider metadata/JWKS where applicable, nonce, expiry, redirect URI, and PKCE. Exchange code only on the backend over TLS.
5. Fetch/validate provider identity and verified email according to provider capabilities. Create or retrieve the `identities` row by `(provider, provider_subject)` and then issue the platform session.
6. Never silently merge accounts because email strings match. For linking, require an authenticated user, recent re-authentication, and proof of control of the identity being linked; reject identities already linked elsewhere and write an audit event.
7. Restrict post-login return paths to an explicit same-origin allowlist to prevent open redirects. Consume state once; make callbacks replay-resistant.
8. Handle provider denial, missing email, revoked consent, disabled accounts, and transient provider failures with safe user-facing errors.

Add integration tests with mocked provider discovery/JWKS/token/user endpoints, plus manual sandbox verification for each provider. Do not use real production credentials in CI.

## 10. Permission node system

Use stable, namespaced permission nodes, for example `platform.admin.users.read`, `platform.admin.users.update`, `platform.admin.roles.manage`, `platform.profile.read`, and `platform.profile.update`. Define a canonical permission registry in backend code (and expose effective grants via API); persist role assignments and permission definitions/grants in PostgreSQL for manageable administration. Document wildcard semantics before implementing them. Prefer exact-node checks initially; if wildcards are required, implement a single tested matcher with explicit ancestor rules.

Create a permission service with functions such as `has_permission(principal, node, resource=None)` and `list_effective_permissions(user_id)`. Default deny. Enforce authorization in backend dependencies/services for every protected endpoint; frontend route guards are usability only, never the security boundary. Distinguish global permissions from resource-scoped checks, and ensure a user cannot authorize access by submitting a role or permission name in their own request.

Seed a least-privilege baseline role and initial permissions through an idempotent seed command/migration. All role/grant changes require audit events, actor identity, reason, and transaction-safe updates. Add tests for direct/role grants, revocations, disabled users, wildcard edge cases if enabled, and direct API access without UI.

## 11. User profile API

Implement these initial endpoints under `/api/v1`:

- `GET /users/me`: current user's safe account/profile representation.
- `PATCH /users/me`: allowlisted mutable fields only (for example display name and profile visibility); validate lengths and formats and return the updated public profile.
- `GET /users/{user_id}`: expose only explicitly public profile fields; return not found or forbidden according to documented privacy policy.
- `GET /users/me/identities`: list linked provider names and safe link metadata, never access/refresh tokens or raw provider responses.
- `POST /users/me/identities/{provider}/start` and callback route: account linking flow with re-authentication and CSRF/state protections.
- `DELETE /users/me/identities/{provider}`: require recent authentication and prevent removal of the last usable sign-in identity unless a recovery method exists.

Use Pydantic request/response schemas, explicit field allowlists, optimistic concurrency only if profile edits can conflict, and audit logging for security-sensitive identity operations. Add pagination only for collection endpoints that need it. Apply per-user rate limits to mutations.

## 12. Admin dashboard API

Create admin endpoints under `/api/v1/admin`, each protected by explicit permission nodes and audited:

- `GET /users` with bounded pagination, search, sort allowlist, and filters for status/provider.
- `GET /users/{id}` for a redacted administrative detail view.
- `PATCH /users/{id}` for permitted status/profile actions; require a reason for suspension or privileged changes.
- `GET /roles`, `POST /roles`, `PATCH /roles/{id}`, and role-permission management with reserved system-role safeguards.
- `GET /permissions` and `GET /users/{id}/permissions` for inspection.
- `POST`/`DELETE` user-role assignment endpoints with idempotency and audit records.
- `GET /audit-events` with bounded pagination and filters; do not offer mutation/deletion endpoints for audit history.

Avoid returning secrets, sessions, provider tokens, or unnecessary personal data. Require re-authentication for high-impact actions, protect against self-lockout and removal of the last active administrator, and use database transactions for multi-row grant changes. Add integration tests proving non-admin callers receive 403 even when they call API routes directly.

## 13. Deployment: VPS backend and Cloudflare Pages frontend

### Local development

Use `infra/compose.yaml` for PostgreSQL and the API, with persistent local volumes and health checks. A developer can run:

```bash
cd /Core
cp .env.example .env
pnpm install
pnpm dev
cd backend && uv sync
cd /Core && docker compose -f infra/compose.yaml up --build
```

Keep local secrets in ignored `.env`; `.env.example` contains placeholders only. Document migration, seed, test, and reset commands. Never put production secrets into Compose files committed to Git.

### Production topology

- Deploy the FastAPI container and PostgreSQL on a managed VPS/private network. Do not expose PostgreSQL publicly. Use automated encrypted backups and periodically test restoration.
- Put a reverse proxy (Caddy or Nginx) in front of FastAPI for TLS, request limits, security headers, and `/api` routing. Restrict inbound ports to SSH management and HTTPS; use a firewall and key-based SSH.
- Use a managed PostgreSQL service or a separately secured database host where feasible. If colocated, isolate it on a private Docker network and maintain off-host backups.
- Deploy `apps/web` to Cloudflare Pages with a custom domain. Set production API base URL and auth callback URLs in Pages environment configuration. Configure SPA fallback behavior and exact allowed origins.
- Use separate preview/staging/production environments, OAuth apps, domains, and secrets. Apply database migrations as a gated one-off release step before or alongside the API rollout; take a backup before production schema changes.
- Add health monitoring, error alerting, uptime checks, log retention, and a documented rollback procedure. Pin container images by release tag or digest. Run the container as a non-root user and keep the base image/dependencies updated.

## 14. GitHub Actions CI/CD

Create `.github/workflows/ci.yml` for pull requests and pushes. Suggested jobs:

1. Frontend: install with frozen pnpm lockfile, lint, typecheck, unit/component tests, and production build.
2. Backend: install locked dependencies, run Ruff format/lint, mypy if configured, pytest, and coverage threshold for security-critical services.
3. Database: start PostgreSQL service container, apply all Alembic migrations from an empty database, and run API integration tests.
4. Contract: generate OpenAPI and TypeScript types, then fail if generated types are stale.
5. Security: dependency audit/scanning and secret scanning; fail on actionable high-severity issues according to documented policy.

Create separate deployment workflows. Cloudflare Pages deployments should use protected environment secrets and deploy previews from pull requests only when safe. VPS deployment should occur only from a protected release branch/tag or an approved GitHub Environment, use short-lived OIDC-based cloud credentials where supported (otherwise scoped deploy key/secrets), build and scan an immutable backend image, then deploy, migrate, health-check, and roll back on failed readiness. Do not give pull-request workflows production secrets. Protect main with required CI, review, and environment approvals.

## 15. Reference-workspace pattern copying

The existing sites use Vite, React 19, React Router, a shared `ifamished-ui` dependency, and Cloudflare-oriented build/deploy scripts. Their `App.jsx` files demonstrate route composition, shared navbar/footer, and route-level page composition. The HungerNet developer tools illustrate stateful form flows and accordion-based guidance; the SMP component illustrates copy-to-clipboard feedback; the OptiFine utility illustrates isolated transformation logic; the CSS overrides show grid, spacing, and token-based styling patterns.

Use these steps for each candidate pattern:

1. Read the file and its immediate imports in the reference workspace; inspect the relevant stylesheet and call sites to understand dependencies and behavior.
2. Record the behavior and public contract to preserve. Identify branding, routes, endpoints, text, and site-specific assets that must remain configurable or be excluded.
3. Copy only into a new `/Core/packages/...` or `/Core/apps/...` file. Never move, rename, format, or edit the original. Do not use a script whose glob could include reference paths.
4. Convert the copied code to TypeScript, replace external/site-specific dependencies with platform package APIs where appropriate, and add accessible states and tests.
5. Compare output behavior to the reference manually, then run typecheck, lint, relevant tests, and build from `/Core`.
6. Record the source path in a small attribution/porting note where useful, while preserving applicable licenses and avoiding copying third-party code without permission.

Before any bulk command, verify the current directory with `pwd` and scope all output paths under `/Core`. In particular, do not run `npm install`, formatters, codemods, or `git clean` from a reference workspace. Only add copied files to the Core repository; keep reference working trees byte-for-byte unchanged.

## 16. JSX to TSX migration strategy

Migrate incrementally; do not attempt a whole-monorepo conversion before the shared packages and contracts are stable.

1. Configure `apps/web` with Vite React TypeScript, strict `tsconfig`, `noImplicitAny`, `strictNullChecks`, and path/package aliases. Add `typescript`, `@types/react`, `@types/react-dom`, and relevant router types if required by the chosen versions.
2. Start with leaf utilities that have clear inputs/outputs, such as the version parsing utility: rename a copied Core implementation from `.js` to `.ts`, declare its input/output and edge cases, and add tests.
3. Convert presentational UI primitives next. Type props, event handlers, children, refs, and polymorphic behavior explicitly. Avoid `any`; use `unknown` plus validation at untrusted boundaries.
4. Convert route pages and components after shared contracts exist. Define typed route data, form state, search-param parsing, and API results. Preserve URL behavior only where it contains non-sensitive information.
5. Fix unsafe patterns during conversion: do not serialize passwords or API tokens into query strings; validate URL parameters; clear timers/listeners; handle clipboard rejection; and avoid implicit effect dependencies.
6. Convert `App.jsx` route composition to `App.tsx`, type navigation/social items, and retain a single route map where practical. Keep site-specific `App` composition out of a generic UI package.
7. Enable `allowJs` only temporarily for staged migration. Track remaining JavaScript under Core, then disable `allowJs` after conversion. Do not change extensions or contents in reference workspaces.
8. For any future site migration, do it as a separate, explicitly authorized consumer change. This platform task alone must not alter the reference apps.

Commands for Core-only staged conversion can use `pnpm exec tsc --noEmit`, `pnpm lint`, and focused tests. Avoid blind `.jsx` to `.tsx` renames: typecheck and tests must accompany each logical slice.

## 17. Delivery phases and acceptance checks

### Phase A: Foundation
Create the workspace, lint/format/typecheck/test scripts, CI baseline, environment examples, and local PostgreSQL Compose setup. Acceptance: clean install and all baseline checks pass from `/Core`.

### Phase B: Contracts and design system
Implement tokens/themes, UI primitives, domain types, API error contract, and OpenAPI type generation. Acceptance: accessible component tests pass; generated API types are reproducible; at least one Core demo route uses the shared UI.

### Phase C: Backend and database
Create FastAPI app, settings, health endpoints, SQLAlchemy models, Alembic baseline, repositories/services, and test database setup. Acceptance: fresh database migration succeeds; readiness checks DB; API tests pass.

### Phase D: Identity and auth
Implement sessions, provider integrations, login callbacks, account linking safeguards, and React auth provider. Acceptance: provider sandbox flows work; replay/state/redirect protections are tested; secrets never appear in browser storage, URLs, or logs.

### Phase E: Profiles and authorization
Implement user profile routes, permission registry/evaluator, role persistence/seeds, and audit events. Acceptance: default deny; profile privacy and mutations are tested; revoked access takes effect promptly.

### Phase F: Admin portal/API
Implement admin endpoints and a typed Core admin UI with user search, role management, permission inspection, and audit history. Acceptance: direct API calls enforce permissions; high-impact changes are audited and protected from self-lockout.

### Phase G: Release operations
Configure staging/production VPS and Cloudflare Pages, provider apps, secrets, backups, monitoring, CI deployments, and rollback runbooks. Acceptance: staging deployment is repeatable from CI; health checks pass after deployment; backup restore and rollback are exercised.

### Phase H: Controlled reuse/migration
Port selected patterns into Core packages and use those packages only in Core applications until separately authorized consumer migrations. Acceptance: all reference workspaces remain unchanged; Core tests/build pass; the migration inventory documents remaining JSX and dependencies.

## 18. Security and operational gates

Before production launch, complete a threat model covering account takeover, identity linking, CSRF, open redirects, session theft, privilege escalation, admin misuse, brute force, database exfiltration, and secret leakage. Require TLS, secure cookie attributes, session rotation/revocation, CSRF/origin protections, strict CORS, rate limiting, least privilege, audit trails, encrypted backups, dependency updates, and incident/credential-rotation procedures. Review privacy/data-retention requirements for profile and audit data. Do not claim a system secure solely because CI is green; require a focused security review before handling real accounts.
