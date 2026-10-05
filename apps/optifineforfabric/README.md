# OptiFine for Fabric Site

This app exposes the public OptiFine for Fabric site and uses the shared Modrinth client logic for version fetching and release metadata.

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
- Environment variable: `VITE_API_BASE_URL`

Example:

```env
VITE_API_BASE_URL=https://api.hungernet.dev/api/v1
```

The Modrinth integration is intentionally kept in the shared client layer so it is not duplicated across multiple app code paths.
