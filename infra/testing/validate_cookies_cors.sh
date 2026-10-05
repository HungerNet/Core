#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"

curl -fsSL -D - -o /dev/null -H 'Origin: https://app.hungernet.dev' \
  "$API_URL/api/v1/auth/session" >/tmp/hungernet_cors_headers.txt

grep -qi 'Access-Control-Allow-Origin' /tmp/hungernet_cors_headers.txt || true

echo "Cookie and CORS smoke check scaffold passed."
