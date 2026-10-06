#!/usr/bin/env bash
set -euo pipefail

curl -fsSL "http://localhost:8080/health/live" >/dev/null
curl -fsSL "http://localhost:8000/health/live" >/dev/null
curl -fsSL "http://localhost:8080/api/v1/auth/session" >/dev/null || true

echo "Proxy smoke check passed."
