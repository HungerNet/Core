# Hunger SMP Site

This app wraps the public Hunger SMP experience and can call the shared platform API for project and announcement data.

The `/auth/callback` route completes the shared OAuth flow for the `hungersmp` client. Global colors, glass surfaces, responsive spacing, and reduced-motion behavior come from `packages/styles/src/sites/platform.css`; page-specific rules stay in `src/styles/overrides.css`.

## Local development

```bash
cd /Core
pnpm install
pnpm --filter @hungernet/hungersmp dev
```

## Build

```bash
cd /Core
pnpm --filter @hungernet/hungersmp build
```

## Cloudflare Pages configuration

- Root directory: `.`
- Build command: `pnpm --filter @hungernet/hungersmp build`
- Output directory: `apps/hungersmp/dist`

The API and Accounts hosts are selected from the current origin using hardcoded domain constants; no build-time URL setting is required.

Do not expose private API keys or session data in the frontend build.
