#!/usr/bin/env sh
set -eu
umask 077

: "${PGHOST:?Set PGHOST}"
: "${PGDATABASE:?Set PGDATABASE}"
: "${PGUSER:?Set PGUSER}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
backup_file="$BACKUP_DIR/${PGDATABASE}-$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_dump --format=custom --no-owner --file="$backup_file"
printf 'Created backup: %s\n' "$backup_file"
