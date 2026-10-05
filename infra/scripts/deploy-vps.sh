#!/usr/bin/env sh
set -eu

: "${DEPLOY_HOST:?Set DEPLOY_HOST}"
: "${DEPLOY_USER:?Set DEPLOY_USER}"
: "${DEPLOY_PATH:?Set DEPLOY_PATH}"
: "${VPS_ENV_FILE:?Set VPS_ENV_FILE to the protected environment file path on the VPS}"
: "${API_IMAGE:?Set API_IMAGE to an immutable image tag or digest}"
: "${SSH_PRIVATE_KEY:?Set SSH_PRIVATE_KEY}"

case "$DEPLOY_PATH$VPS_ENV_FILE" in
	*[!A-Za-z0-9_./-]*)
		echo "DEPLOY_PATH and VPS_ENV_FILE may contain only letters, numbers, _, ., /, and -." >&2
		exit 2
		;;
esac

case "$DEPLOY_PATH" in
	/*) ;;
	*) echo "DEPLOY_PATH must be absolute." >&2; exit 2 ;;
esac

case "$VPS_ENV_FILE" in
	/*) ;;
	*) echo "VPS_ENV_FILE must be absolute." >&2; exit 2 ;;
esac

remote="${DEPLOY_USER}@${DEPLOY_HOST}"
ssh "$remote" "mkdir -p '$DEPLOY_PATH/infra'"
scp infra/docker-compose.yml infra/Caddyfile "$remote:$DEPLOY_PATH/infra/"

compose="docker compose --env-file '$VPS_ENV_FILE' -f infra/docker-compose.yml"
ssh "$remote" "cd '$DEPLOY_PATH' && API_IMAGE='$API_IMAGE' $compose pull api migrate"
ssh "$remote" "cd '$DEPLOY_PATH' && API_IMAGE='$API_IMAGE' $compose run --rm migrate"
ssh "$remote" "cd '$DEPLOY_PATH' && API_IMAGE='$API_IMAGE' $compose up -d --wait --wait-timeout 120 api caddy"
ssh "$remote" "cd '$DEPLOY_PATH' && $compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile"
