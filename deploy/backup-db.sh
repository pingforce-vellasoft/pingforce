#!/usr/bin/env bash
# Nightly Postgres backup for the PingForce production stack.
#
# Install on the OCI VM:
#   sudo cp /opt/pingforce/backup-db.sh /usr/local/bin/pingforce-backup
#   sudo chmod +x /usr/local/bin/pingforce-backup
#   sudo crontab -e
#   # 02:15 daily
#   15 2 * * * /usr/local/bin/pingforce-backup >> /var/log/pingforce-backup.log 2>&1
#
# Restore a dump:
#   gunzip -c /opt/pingforce/backups/pingforce-YYYY-MM-DD.sql.gz \
#     | docker compose exec -T -e PGPASSWORD="$DB_PASSWORD" postgres \
#         psql -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME"

set -euo pipefail

STACK_DIR=/opt/pingforce
BACKUP_DIR="$STACK_DIR/backups"
RETENTION_DAYS=14

cd "$STACK_DIR"

# shellcheck disable=SC1091
DB_USER=$(grep -E '^DB_USER=' .env | cut -d= -f2-)
DB_PASSWORD=$(grep -E '^DB_PASSWORD=' .env | cut -d= -f2-)
DB_NAME=$(grep -E '^DB_NAME=' .env | cut -d= -f2-)

mkdir -p "$BACKUP_DIR"

# An optional label distinguishes ad-hoc runs from the nightly one. Without it
# a pre-deploy backup taken on the same day would overwrite that day's nightly
# dump — replacing a known-good snapshot with one taken seconds before a
# migration is about to modify the schema.
#   pingforce-backup                  → pingforce-YYYY-MM-DD.sql.gz
#   pingforce-backup predeploy-abc123 → pingforce-YYYY-MM-DD-predeploy-abc123.sql.gz
LABEL="${1:-}"
STAMP=$(date +%F)
if [ -n "$LABEL" ]; then
  STAMP="$STAMP-$(echo "$LABEL" | tr -cd '[:alnum:]._-' | cut -c1-40)"
fi
OUT="$BACKUP_DIR/pingforce-$STAMP.sql.gz"

# Write to a temp file first so an interrupted run never leaves a truncated
# dump sitting at the final path looking like a valid backup.
TMP="$OUT.partial"

docker compose exec -T -e PGPASSWORD="$DB_PASSWORD" postgres \
  pg_dump -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" --clean --if-exists \
  | gzip -9 >"$TMP"

# A dump of an empty-but-healthy database succeeds and looks fine by size alone.
# That is exactly what happened on 2026-07-23, so check the payload before this
# file is allowed to replace anything or reset the retention clock.
if ! gzip -t "$TMP" 2>/dev/null; then
  echo "$(date -Is) FATAL: dump is not a valid gzip stream — keeping previous backups" >&2
  rm -f "$TMP"
  exit 1
fi

TABLES=$(gunzip -c "$TMP" | grep -cE '^COPY public\.' || true)
if [ "$TABLES" -lt 50 ]; then
  echo "$(date -Is) FATAL: dump has only $TABLES COPY blocks (expected 90+) — refusing to store it" >&2
  rm -f "$TMP"
  exit 1
fi

mv "$TMP" "$OUT"
echo "$(date -Is) backup written: $OUT ($(du -h "$OUT" | cut -f1), $TABLES tables)"

# An empty super_admins table locks everyone out of the admin portal. Exit
# non-zero so cron mails the operator — a warning on stderr alone went unread
# through the whole 2026-07-23 outage. Pruning is deliberately skipped in this
# path: if the live database is in a bad state, old good backups must survive.
ADMINS=$(docker compose exec -T -e PGPASSWORD="$DB_PASSWORD" postgres \
  psql -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -tAc \
  "select count(*) from super_admins where status='ACTIVE' and \"deletedAt\" is null")

if [ "$ADMINS" -eq 0 ]; then
  echo "$(date -Is) ERROR: no active super admin rows — admin portal login is broken" >&2
  echo "$(date -Is) retention prune skipped so older good backups are preserved" >&2
  exit 1
fi

find "$BACKUP_DIR" -name 'pingforce-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
echo "$(date -Is) pruned backups older than $RETENTION_DAYS days"
