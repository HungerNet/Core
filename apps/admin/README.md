# HungerNet Admin Dashboard

This app provides the platform administration surface for user management, role/permission review, audits, and project posting workflows.

## Included flows

- User search and status management
- Role creation and editing with lowercase alphanumeric IDs, configurable colors, and permission nodes
- Role assignment and revocation from user details (system roles are protected)
- Project posting and moderation actions
- Audit log review and access control checks
- Shared auth guards from `@hungernet/auth`

The built-in `Member` role has no permission nodes. `Superuser` receives every registered permission node, including `roles.create`. Role colors are six-digit hexadecimal values.

## Local development

```bash
cd /Core
pnpm install
pnpm --filter @hungernet/admin dev
```

## Build

```bash
cd /Core
pnpm --filter @hungernet/admin build
```

## Cloudflare Pages configuration

- Root directory: `.`
- Build command: `pnpm --filter @hungernet/admin build`
- Output directory: `apps/admin/dist`

The API and Account hosts are selected from the current origin using hardcoded domain constants; no build-time URL setting is required.

This app should only consume the authenticated platform API; do not add credentials or private tokens to the frontend bundle.
