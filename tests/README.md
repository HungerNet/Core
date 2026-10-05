# Core Test Harness

This directory contains the first-pass integration smoke checks for the HungerNet platform.

## Coverage

- OAuth2/OIDC callback and state validation
- Session and JWT issuance semantics
- Permission and role enforcement
- User profile editing and public profile visibility
- Project posting and retrieval
- Modrinth API version lookups for OptiFine for Fabric
- Reverse-proxy validation and cookie/CORS behavior

## Execution

Use the backend test environment and app URLs defined in the deployment config:

```bash
cd /home/container/Core
python -m pytest tests
```

The current scaffold is intentionally lightweight and meant to be expanded as the backend and app flows are finalized.
