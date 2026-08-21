#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 || ! -d $1 ]]; then
    echo "usage: smoke.sh /root/backups/vless-443-YYYYMMDD-HHMMSS" >&2
    exit 1
fi

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly BASELINE_DIR="$1"

systemctl is-active --quiet nginx
systemctl is-active --quiet x-ui
nginx -t >/dev/null
/usr/local/x-ui/bin/xray-linux-amd64 run -test \
    -config /usr/local/x-ui/bin/config.json >/dev/null

curl --resolve alfanib.ru:443:127.0.0.1 \
    --fail --silent --show-error --max-time 15 \
    --output /dev/null https://alfanib.ru/
auth_status="$(curl --resolve alfanib.ru:443:127.0.0.1 \
    --silent --show-error --max-time 15 \
    --output /dev/null --write-out '%{http_code}' \
    https://alfanib.ru/auth/v1/health)"
[[ "$auth_status" == "401" ]]
rest_status="$(curl --resolve alfanib.ru:443:127.0.0.1 \
    --silent --show-error --max-time 15 \
    --output /dev/null --write-out '%{http_code}' \
    https://alfanib.ru/rest/v1/)"
[[ "$rest_status" == "401" ]]
storage_status="$(curl --resolve alfanib.ru:443:127.0.0.1 \
    --silent --show-error --max-time 15 \
    --output /dev/null --write-out '%{http_code}' \
    https://alfanib.ru/storage/v1/bucket)"
[[ "$storage_status" == "400" ]]

ss -H -lnt '( sport = :443 )' | grep -q ':443'
ss -H -lnt '( sport = :10443 )' | grep -q '127.0.0.1:10443'
ss -H -lnt '( sport = :2087 )' | grep -q '127.0.0.1:2087'
if ss -H -lnt '( sport = :2087 )' | grep -qE '0\.0\.0\.0:2087|\*:2087|\[::\]:2087'; then
    echo "Xray port 2087 is still public" >&2
    exit 1
fi

docker inspect --format '{{.State.Running}}' amnezia-awg2 | grep -qx true
docker inspect --format '{{.State.Running}}' supabase-kong | grep -qx true
docker inspect --format '{{.State.Running}}' whatsapp-proxy | grep -qx true
ss -H -lnu '( sport = :42692 )' | grep -q ':42692'
ss -H -lnu '( sport = :51820 )' | grep -q ':51820'

current_container_state="$(mktemp)"
current_udp_state="$(mktemp)"
current_tcp_state="$(mktemp)"
trap 'rm -f "$current_container_state" "$current_udp_state" "$current_tcp_state"' EXIT
docker inspect --format '{{.Name}} {{.Id}} {{.Config.Image}} {{json .NetworkSettings.Ports}}' \
    amnezia-awg2 supabase-kong whatsapp-proxy | sort > "$current_container_state"
{
    ss -H -lnu '( sport = :42692 )'
    ss -H -lnu '( sport = :51820 )'
} | sort > "$current_udp_state"
ss -H -lnt | awk '$4 !~ /:(443|10443|2087)$/ { print $4 }' | sort \
    > "$current_tcp_state"
cmp "$BASELINE_DIR/container-state.txt" "$current_container_state"
cmp "$BASELINE_DIR/udp-state.txt" "$current_udp_state"
cmp "$BASELINE_DIR/tcp-state.txt" "$current_tcp_state"

"$SCRIPT_DIR/smoke_vless.py" --external-port 443

echo "server smoke passed"
