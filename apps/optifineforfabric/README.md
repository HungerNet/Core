# OptiFine for Fabric Site

This app exposes the public OptiFine for Fabric site and uses the shared Modrinth client logic for version fetching and release metadata.

The `/auth/callback` route completes the shared OAuth flow for the `optifineforfabric` client. Global colors, glass surfaces, responsive spacing, and reduced-motion behavior come from `packages/styles/src/sites/platform.css`; page-specific rules stay in `src/styles/overrides.css`.

## Local development

```bash
cd /Core
pnpm install
pnpm --filter @hungernet/optifineforfabric dev
```

## Build

```bash
cd /Core
pnpm --filter @hungernet/optifineforfabric build
```

## Cloudflare Pages configuration

- Root directory: `.`
- Build command: `pnpm --filter @hungernet/optifineforfabric build`
- Output directory: `apps/optifineforfabric/dist`

The API and Accounts hosts are selected from the current origin using hardcoded domain constants; no build-time URL setting is required.

The Modrinth integration is intentionally kept in the shared client layer so it is not duplicated across multiple app code paths.
