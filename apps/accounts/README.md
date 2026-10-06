# HungerNet Accounts Dashboard

This app is the platform account dashboard for profile editing, session/device management, and linked identity flows.

## Included flows

- Profile read/update for username, email, bio, and avatar metadata
- OAuth provider linking for Google, GitHub, and Discord
- Session/device listing and revocation
- Authenticated route handling via the shared `@hungernet/auth` package

## Local development

```bash
cd /Core
pnpm install
pnpm --filter @hungernet/accounts dev
```

## Build

```bash
cd /Core
pnpm --filter @hungernet/accounts build
```

## Cloudflare Pages configuration

- Root directory: `.`
- Build command: `pnpm --filter @hungernet/accounts build`
- Output directory: `apps/accounts/dist`
- Environment variable: `VITE_API_BASE_URL`

Set `VITE_API_BASE_URL` to the public API origin, for example:

```env
VITE_API_BASE_URL=https://api.hungernet.dev/api/v1
```

No secrets belong in this app or in the repository. Keep all OAuth credentials in the backend deployment environment or a secret manager.
