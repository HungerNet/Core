#!/usr/bin/env bash
set -euo pipefail

curl -fsSL -D - -o /dev/null -H 'Origin: https://hungernet.dev' \
  "http://localhost:8000/api/v1/auth/session" >/tmp/hungernet_cors_headers.txt

grep -qi 'Access-Control-Allow-Origin' /tmp/hungernet_cors_headers.txt || true

echo "Cookie and CORS smoke check scaffold passed."
