#!/usr/bin/env bash
set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

systemctl is-active --quiet nginx
systemctl is-active --quiet x-ui
nginx -t >/dev/null
/usr/local/x-ui/bin/xray-linux-amd64 run -test \
    -config /usr/local/x-ui/bin/config.json >/dev/null

curl --fail --silent --show-error --max-time 15 \
    --output /dev/null https://alfanib.ru/
"$SCRIPT_DIR/smoke_vless.py" \
    --server-address 127.0.0.1 \
    --external-port 2087

echo "production baseline passed"
