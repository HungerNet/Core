# Infra Testing

This harness validates the local reverse proxy, auth cookies, CORS behavior, and redirect safety before deployment.

## Included checks

- `validate_proxy.sh`: verifies the upstream API and auth endpoints are reachable through the configured proxy.
- `validate_cookies_cors.sh`: verifies secure cookie attributes, same-site behavior, and CORS allowlists.

## Expected usage

```bash
cd /home/container/Core
bash infra/testing/validate_proxy.sh
bash infra/testing/validate_cookies_cors.sh
```

These scripts are intentionally scaffolded for expansion as the deployment topology and domain rules are finalized.
