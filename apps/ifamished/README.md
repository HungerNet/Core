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

The API and Accounts hosts are selected from the current origin using hardcoded domain constants; no build-time URL setting is required.

This app is front-end only; keep any secret or sensitive configuration on the backend.
