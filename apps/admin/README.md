# HungerNet Admin Dashboard

This app provides the platform administration surface for user management, role/permission review, audits, and project posting workflows.

## Included flows

- User search and status management
- Role and permission management
- Project posting and moderation actions
- Audit log review and access control checks
- Shared auth guards from `@hungernet/auth`

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

The API and Accounts hosts are selected from the current origin using hardcoded domain constants; no build-time URL setting is required.

This app should only consume the authenticated platform API; do not add credentials or private tokens to the frontend bundle.
