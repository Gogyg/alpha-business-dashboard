#!/usr/bin/env bash
set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly NGINX_CONF="/etc/nginx/nginx.conf"
readonly ALPHA_CONF="/etc/nginx/sites-available/alpha"
readonly STREAM_DIR="/etc/nginx/stream-conf.d"
readonly STREAM_CONF="$STREAM_DIR/443-sni-router.conf"
readonly XUI_DB="/etc/x-ui/x-ui.db"
readonly INBOUND_PORT="2087"
readonly REALITY_SERVER_NAME="dl.google.com"
readonly BACKUP_DIR="/root/backups/vless-443-$(date +%Y%m%d-%H%M%S)"
MUTATION_STARTED=0

rollback_on_error() {
    local status=$?
    trap - ERR
    if [[ $MUTATION_STARTED -eq 1 ]]; then
        if ! "$SCRIPT_DIR/rollback.sh" "$BACKUP_DIR"; then
            echo "CRITICAL: automatic rollback failed: $BACKUP_DIR" >&2
            exit 2
        fi
    fi
    exit "$status"
}
trap rollback_on_error ERR

if [[ $EUID -ne 0 ]]; then
    echo "deploy.sh must run as root" >&2
    exit 1
fi

for required_file in \
    "$NGINX_CONF" \
    "$ALPHA_CONF" \
    "$XUI_DB" \
    "$SCRIPT_DIR/nginx/alpha.conf" \
    "$SCRIPT_DIR/nginx/stream-443.conf" \
    "$SCRIPT_DIR/configure_xui.py"; do
    [[ -f "$required_file" ]] || {
        echo "missing required file: $required_file" >&2
        exit 1
    }
done

readonly REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
git -C "$REPO_ROOT" fetch origin main --quiet
[[ "$(git -C "$REPO_ROOT" rev-parse HEAD)" == \
   "$(git -C "$REPO_ROOT" rev-parse origin/main)" ]]
[[ -z "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=all)" ]]

systemctl is-active --quiet nginx
systemctl is-active --quiet x-ui
grep -Fq "ngx_stream_module.so" /etc/nginx/modules-enabled/50-mod-stream.conf
"$SCRIPT_DIR/smoke_baseline.sh"

mkdir -p "$BACKUP_DIR"
cp -a /etc/nginx/nginx.conf "$BACKUP_DIR/nginx.conf"
cp -a /etc/nginx/sites-available/alpha "$BACKUP_DIR/alpha.conf"
if [[ -f "$STREAM_CONF" ]]; then
    cp -a "$STREAM_CONF" "$BACKUP_DIR/443-sni-router.conf"
else
    touch "$BACKUP_DIR/stream-conf-was-absent"
fi
python3 - "$BACKUP_DIR/x-ui.db" <<'PY'
import sqlite3
import sys

source = sqlite3.connect("/etc/x-ui/x-ui.db")
target = sqlite3.connect(sys.argv[1])
try:
    source.backup(target)
finally:
    target.close()
    source.close()
PY
docker inspect --format '{{.Name}} {{.Id}} {{.Config.Image}} {{json .NetworkSettings.Ports}}' \
    amnezia-awg2 supabase-kong whatsapp-proxy | sort \
    > "$BACKUP_DIR/container-state.txt"
{
    ss -H -lnu '( sport = :42692 )'
    ss -H -lnu '( sport = :51820 )'
} | sort > "$BACKUP_DIR/udp-state.txt"
ss -H -lnt | awk '$4 !~ /:(443|10443|2087)$/ { print $4 }' | sort \
    > "$BACKUP_DIR/tcp-state.txt"

MUTATION_STARTED=1
mkdir -p "$STREAM_DIR"
install -m 0644 "$SCRIPT_DIR/nginx/alpha.conf" "$ALPHA_CONF"
install -m 0644 "$SCRIPT_DIR/nginx/stream-443.conf" "$STREAM_CONF"
if ! grep -Fq "include /etc/nginx/stream-conf.d/*.conf;" "$NGINX_CONF"; then
    printf '\nstream {\n    include /etc/nginx/stream-conf.d/*.conf;\n}\n' >> "$NGINX_CONF"
fi

nginx -t

systemctl stop x-ui
python3 "$SCRIPT_DIR/configure_xui.py" \
    --db "$XUI_DB" \
    --inbound-port "$INBOUND_PORT" \
    --reality-server-name "$REALITY_SERVER_NAME"
systemctl restart x-ui
systemctl is-active --quiet x-ui

for _ in $(seq 1 20); do
    if /usr/local/x-ui/bin/xray-linux-amd64 run -test \
        -config /usr/local/x-ui/bin/config.json >/dev/null 2>&1; then
        break
    fi
    sleep 1
done
/usr/local/x-ui/bin/xray-linux-amd64 run -test \
    -config /usr/local/x-ui/bin/config.json >/dev/null

echo "waiting for Xray listener on 127.0.0.1:2087"
listener_ready=0
for _ in $(seq 1 20); do
    if ss -H -lnt '( sport = :2087 )' | grep -q '127.0.0.1:2087'; then
        listener_ready=1
        break
    fi
    sleep 1
done
if [[ $listener_ready -ne 1 ]]; then
    echo "Xray listener did not start on 127.0.0.1:2087" >&2
    exit 1
fi

systemctl reload nginx
"$SCRIPT_DIR/smoke.sh" "$BACKUP_DIR"

trap - ERR
echo "deployment complete"
echo "backup: $BACKUP_DIR"
echo "rollback: $SCRIPT_DIR/rollback.sh $BACKUP_DIR"
