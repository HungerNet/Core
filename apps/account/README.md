# HungerNet Accounts Dashboard

This app is the platform account dashboard for profile editing, session/device management, and linked identity flows.

## Included flows

- Profile read/update for username, email, and bio
- Avatar uploads through `POST /users/me/avatar` (PNG, JPEG, WebP, or GIF, up to 5 MB)
- OAuth provider linking for Google, GitHub, Discord, and Microsoft
- Authenticator MFA enrollment/removal and password changes
- Session/device listing and revocation
- Authenticated route handling via the shared `@hungernet/auth` package

The profile page keeps its existing settings layout. Avatar changes are uploaded as image bytes and stored by the backend; avatar URLs cannot be edited in the profile form.

## Local development

```bash
cd /Core
pnpm install
pnpm --filter @hungernet/account dev
```

## Build

```bash
cd /Core
pnpm --filter @hungernet/account build
```

## Cloudflare Pages configuration

- Root directory: `.`
- Build command: `pnpm --filter @hungernet/account build`
- Output directory: `apps/account/dist`

The API and Accounts hosts are selected from the current origin using hardcoded domain constants; no build-time URL setting is required.

No secrets belong in this app or in the repository. Keep all OAuth credentials in the backend deployment environment or a secret manager.
