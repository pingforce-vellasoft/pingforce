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

STAMP=$(date +%F)
OUT="$BACKUP_DIR/pingforce-$STAMP.sql.gz"

# Write to a temp file first so an interrupted run never leaves a truncated
# dump sitting at the final path looking like a valid backup.
TMP="$OUT.partial"

docker compose exec -T -e PGPASSWORD="$DB_PASSWORD" postgres \
  pg_dump -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" --clean --if-exists \
  | gzip -9 >"$TMP"

mv "$TMP" "$OUT"
echo "$(date -Is) backup written: $OUT ($(du -h "$OUT" | cut -f1))"

# Fail loudly if the super admin table is empty — that is the failure mode that
# locks everyone out of the admin portal, and a backup run is a good time to notice.
ADMINS=$(docker compose exec -T -e PGPASSWORD="$DB_PASSWORD" postgres \
  psql -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -tAc \
  "select count(*) from super_admins where status='ACTIVE' and \"deletedAt\" is null")

if [ "$ADMINS" -eq 0 ]; then
  echo "$(date -Is) WARNING: no active super admin rows — admin portal login is broken" >&2
fi

find "$BACKUP_DIR" -name 'pingforce-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
echo "$(date -Is) pruned backups older than $RETENTION_DAYS days"
