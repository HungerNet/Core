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

The API and Accounts hosts are selected from the current origin using hardcoded domain constants; no build-time URL setting is required.

Keep all user data and secrets on the backend, not in client-side route state or URL parameters.
