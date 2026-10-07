# HungerNet Site

This is the public site app for the HungerNet platform. It includes landing, hosting, tools, project views, and public account/profile surfaces that can call the shared platform API when configured.

## Account and profile routes

- `/auth/callback` completes the shared OAuth flow for the `hungernet` client.
- `/user/<username>` shows a public profile, its roles, and recent online presence. Private or disabled profiles show an unavailable page.
- Profile images are uploaded from Accounts and displayed using the stored URL returned by the API.

The public site uses the shared dark glass palette and responsive motion styles in `packages/styles/src/sites/platform.css`. Keep page content inside the existing routed layout and honor reduced-motion preferences.

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
