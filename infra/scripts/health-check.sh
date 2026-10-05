#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://127.0.0.1:8000/api/v1/health/live}"
curl --fail --silent --show-error "$API_URL"
printf '\n'
