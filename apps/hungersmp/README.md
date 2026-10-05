# Hunger SMP Site

This app wraps the public Hunger SMP experience and can call the shared platform API for project and announcement data.

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
- Environment variable: `VITE_API_BASE_URL`

Example:

```env
VITE_API_BASE_URL=https://api.hungernet.dev/api/v1
```

Do not expose private API keys or session data in the frontend build. This app should only receive public URLs and API base configuration.
