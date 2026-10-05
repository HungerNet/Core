# iFamished Site

This public-facing app hosts the iFamished site content inside the shared HungerNet platform architecture.

## Local development

```bash
cd /Core
pnpm install
pnpm --filter @hungernet/ifamished dev
```

## Build

```bash
cd /Core
pnpm --filter @hungernet/ifamished build
```

## Cloudflare Pages configuration

- Root directory: `.`
- Build command: `pnpm --filter @hungernet/ifamished build`
- Output directory: `apps/ifamished/dist`
- Environment variable: `VITE_API_BASE_URL`

Example:

```env
VITE_API_BASE_URL=https://api.hungernet.dev/api/v1
```

This app is front-end only; keep any secret or sensitive configuration on the backend.
