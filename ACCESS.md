# App Access and API Routing

## App domains

Each application has a normal public domain and a Cloudflare Workers preview domain:

| App | Normal domain | Workers.dev domain |
| --- | --- | --- |
| Accounts | [accounts.hungernet.dev](https://accounts.hungernet.dev) | [accounts.millered001.workers.dev](https://accounts.millered001.workers.dev) |
| Admin | [admin.hungernet.dev](https://admin.hungernet.dev) | [admin.millered001.workers.dev](https://admin.millered001.workers.dev) |
| HungerNet | [hungernet.dev](https://hungernet.dev) | [hungernet.millered001.workers.dev](https://hungernet.millered001.workers.dev) |
| Hunger SMP | [hungersmp.com](https://hungersmp.com) | [hungersmp.millered001.workers.dev](https://hungersmp.millered001.workers.dev) |
| iFamished | [ifamished.com](https://ifamished.com) | [ifamished.millered001.workers.dev](https://ifamished.millered001.workers.dev) |
| OptiFine for Fabric | [optifineforfabric.com](https://optifineforfabric.com) | [optifineforfabric.millered001.workers.dev](https://optifineforfabric.millered001.workers.dev) |

## API domains

Both APIs use the `/api/v1` path. The frontend selects the API host from the app's current origin:

| App origin | API base URL |
| --- | --- |
| Normal/custom domain | `https://api.hungernet.dev/api/v1` |
| `*.millered001.workers.dev` | `https://api.hacklets.dev/api/v1` |

`packages/api-client/src/index.ts` rewrites API requests from a valid HTTPS `*.millered001.workers.dev` origin to `api.hacklets.dev`, preserving the configured API path. Normal domains use their configured `VITE_API_BASE_URL`; production builds should set it to `https://api.hungernet.dev/api/v1`.

## Browser connections

From a Workers.dev app, the browser uses `api.hacklets.dev` for API requests and `accounts.millered001.workers.dev` for HungerNet authorization. It does not need to call an `*.hungernet.dev` host. The shared auth resolver enforces the Workers Accounts host even when `VITE_ACCOUNTS_URL` is set to the normal Accounts URL.

From a normal app domain, API calls use `api.hungernet.dev` and authorization uses `accounts.hungernet.dev` unless a deployment explicitly configures another Accounts URL. OAuth providers and any external avatar/image URLs remain separate external destinations.

The API must allow the exact Accounts Workers origin and the constrained `https://*.millered001.workers.dev` origin pattern in both `CORS_ALLOWED_ORIGINS` and `ALLOWED_RETURN_ORIGINS`. After changing API configuration or code, redeploy the API service; changing a frontend build alone cannot update server CORS headers or add API routes.

> The deployed API must include the auth routes used by this workspace, including `GET /api/v1/auth/providers`. A `404` from that endpoint indicates the API deployment is behind the frontend code.