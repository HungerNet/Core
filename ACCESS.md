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

The frontend selects the API host from `window.location.origin` using hardcoded domain constants:

| App origin | API base URL |
| --- | --- |
| Normal/custom domain | `https://api.hungernet.dev/api/v1` |
| Any `*.workers.dev` app | `https://api.hacklets.dev/api/v1` |

Both API hosts use the `/api/v1` path. The `@hungernet/api-client` package contains the fixed host constants; no build-time URL setting is required.

## Browser connections

From a Workers.dev app, the browser uses `api.hacklets.dev` for API requests and `accounts.millered001.workers.dev` for HungerNet authorization. It does not need to call an `*.hungernet.dev` host.

From a normal app domain, API calls use `api.hungernet.dev` and authorization uses `accounts.hungernet.dev`. OAuth providers and external avatar/image URLs remain separate destinations.

The backend has exact hardcoded CORS and OAuth return allowlists for all listed normal and Workers.dev app origins. Unlisted preview subdomains are rejected. Redeploy the API after changing these source constants.

> The deployed API must include the auth routes used by this workspace, including `GET /api/v1/auth/providers`. A `404` from that endpoint indicates the API deployment is behind the frontend code.