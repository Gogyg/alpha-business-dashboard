#!/usr/bin/env bash
set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $EUID -ne 0 ]]; then
    echo "rollback.sh must run as root" >&2
    exit 1
fi

if [[ $# -ne 1 || $1 != /root/backups/vless-443-* ]]; then
    echo "usage: rollback.sh /root/backups/vless-443-YYYYMMDD-HHMMSS" >&2
    exit 1
fi

readonly BACKUP_DIR="$1"
readonly STREAM_CONF="/etc/nginx/stream-conf.d/443-sni-router.conf"

for required_file in nginx.conf alpha.conf x-ui.db; do
    [[ -f "$BACKUP_DIR/$required_file" ]] || {
        echo "backup is incomplete: $BACKUP_DIR/$required_file" >&2
        exit 1
    }
done

cp -a "$BACKUP_DIR/nginx.conf" /etc/nginx/nginx.conf
cp -a "$BACKUP_DIR/alpha.conf" /etc/nginx/sites-available/alpha
if [[ -f "$BACKUP_DIR/stream-conf-was-absent" ]]; then
    rm -f "$STREAM_CONF"
else
    mkdir -p /etc/nginx/stream-conf.d
    cp -a "$BACKUP_DIR/443-sni-router.conf" "$STREAM_CONF"
fi

systemctl stop x-ui
rm -f /etc/x-ui/x-ui.db-wal /etc/x-ui/x-ui.db-shm
cp -a "$BACKUP_DIR/x-ui.db" /etc/x-ui/x-ui.db
python3 - <<'PY'
import sqlite3

connection = sqlite3.connect("/etc/x-ui/x-ui.db")
try:
    result = connection.execute("PRAGMA integrity_check").fetchone()[0]
finally:
    connection.close()
if result != "ok":
    raise SystemExit(f"restored x-ui database failed integrity_check: {result}")
PY
systemctl restart x-ui
systemctl is-active --quiet x-ui

nginx -t
systemctl reload nginx
systemctl is-active --quiet nginx
"$SCRIPT_DIR/smoke_baseline.sh"
echo "rollback complete: $BACKUP_DIR"
