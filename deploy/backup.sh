#!/usr/bin/env bash
# Nightly database dump, kept 7 days locally. Off-server copy: set RCLONE_REMOTE (e.g. b2:olivepinch-backups)
# in /opt/olivepinch/.env after configuring rclone; without it the dump only exists on this VM.
set -euo pipefail
set -a; . /opt/olivepinch/.env; set +a
OUT=/var/backups/olivepinch/olivepinch-$(date +%F).sql.gz
pg_dump "${DATABASE_URL%%\?*}" | gzip > "$OUT"
find /var/backups/olivepinch -name 'olivepinch-*.sql.gz' -mtime +7 -delete
if [ -n "${RCLONE_REMOTE:-}" ]; then rclone copy "$OUT" "$RCLONE_REMOTE"; else echo "WARNING: no RCLONE_REMOTE, backup is only on this server" >&2; fi
