# HungerNet Site

This is the public site app for the HungerNet platform. It includes landing, hosting, tools, project views, and public account/profile surfaces that can call the shared platform API when configured.

## Local development

```bash
cd /Core
pnpm install
pnpm --filter @hungernet/hungernet-site dev
```

## Build

```bash
cd /Core
pnpm --filter @hungernet/hungernet-site build
```

## Cloudflare Pages configuration

- Root directory: `.`
- Build command: `pnpm --filter @hungernet/hungernet-site build`
- Output directory: `apps/hungernet/dist`
- Environment variable: `VITE_API_BASE_URL`

Example:

```env
VITE_API_BASE_URL=https://api.hungernet.dev/api/v1
```

Keep all user data and secrets on the backend, not in client-side route state or URL parameters.
