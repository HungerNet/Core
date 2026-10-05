#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"
PROXY_URL="${PROXY_URL:-http://localhost:8080}"

curl -fsSL "$PROXY_URL/health/live" >/dev/null
curl -fsSL "$API_URL/health/live" >/dev/null
curl -fsSL "$PROXY_URL/api/v1/auth/session" >/dev/null || true

echo "Proxy smoke check passed."
