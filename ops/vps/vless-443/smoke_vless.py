#!/usr/bin/env python3
"""Exercise the active VLESS Reality inbound through a public TCP port."""

import argparse
import json
import os
import socket
import subprocess
import tempfile
import time
from pathlib import Path


DEFAULT_CONFIG = Path("/usr/local/x-ui/bin/config.json")
DEFAULT_XRAY = Path("/usr/local/x-ui/bin/xray-linux-amd64")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--server-config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--xray-binary", type=Path, default=DEFAULT_XRAY)
    parser.add_argument("--server-address", default="2.26.106.1")
    parser.add_argument("--external-port", type=int, required=True)
    parser.add_argument("--internal-port", type=int, default=2087)
    parser.add_argument("--expected-ip", default="2.26.106.1")
    return parser.parse_args()


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.bind(("127.0.0.1", 0))
        return listener.getsockname()[1]


def derive_public_key(xray_binary: Path, private_key: str) -> str:
    result = subprocess.run(
        [str(xray_binary), "x25519", "-i", private_key],
        capture_output=True,
        text=True,
        check=True,
    )
    for line in result.stdout.splitlines():
        if line.startswith("Password (PublicKey):"):
            return line.split(":", 1)[1].strip()
    raise RuntimeError("Xray did not return a Reality public key")


def load_client_values(config_path: Path, internal_port: int) -> dict:
    config = json.loads(config_path.read_text())
    matches = [
        inbound
        for inbound in config.get("inbounds", [])
        if inbound.get("port") == internal_port
        and inbound.get("protocol") == "vless"
        and inbound.get("streamSettings", {}).get("security") == "reality"
    ]
    if len(matches) != 1:
        raise RuntimeError(
            f"expected one VLESS Reality inbound on {internal_port}, "
            f"found {len(matches)}"
        )

    inbound = matches[0]
    clients = inbound["settings"]["clients"]
    reality = inbound["streamSettings"]["realitySettings"]
    if not clients or not reality.get("serverNames") or not reality.get("shortIds"):
        raise RuntimeError("active VLESS Reality inbound is incomplete")
    return {
        "id": clients[0]["id"],
        "flow": clients[0].get("flow", ""),
        "private_key": reality["privateKey"],
        "server_name": reality["serverNames"][0],
        "short_id": reality["shortIds"][0],
    }


def wait_for_socks(port: int, process: subprocess.Popen) -> None:
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("temporary Xray client exited before listening")
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.2):
                return
        except OSError:
            time.sleep(0.1)
    raise RuntimeError("temporary Xray client did not open its SOCKS port")


def main() -> int:
    args = parse_args()
    values = load_client_values(args.server_config, args.internal_port)
    public_key = derive_public_key(args.xray_binary, values.pop("private_key"))
    socks_port = find_free_port()
    client_config = {
        "log": {"loglevel": "warning"},
        "inbounds": [
            {
                "listen": "127.0.0.1",
                "port": socks_port,
                "protocol": "socks",
                "settings": {"auth": "noauth", "udp": False},
            }
        ],
        "outbounds": [
            {
                "protocol": "vless",
                "settings": {
                    "vnext": [
                        {
                            "address": args.server_address,
                            "port": args.external_port,
                            "users": [
                                {
                                    "id": values["id"],
                                    "encryption": "none",
                                    "flow": values["flow"],
                                }
                            ],
                        }
                    ]
                },
                "streamSettings": {
                    "network": "raw",
                    "security": "reality",
                    "realitySettings": {
                        "serverName": values["server_name"],
                        "fingerprint": "chrome",
                        "password": public_key,
                        "shortId": values["short_id"],
                        "spiderX": "",
                    },
                },
            }
        ],
    }

    config_path = None
    process = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", prefix="vless-smoke-", suffix=".json", delete=False
        ) as temporary_config:
            config_path = Path(temporary_config.name)
            json.dump(client_config, temporary_config, separators=(",", ":"))
        os.chmod(config_path, 0o600)
        process = subprocess.Popen(
            [str(args.xray_binary), "run", "-config", str(config_path)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        wait_for_socks(socks_port, process)
        proxy = f"127.0.0.1:{socks_port}"
        public_ip = subprocess.run(
            [
                "curl",
                "--socks5-hostname",
                proxy,
                "--fail",
                "--silent",
                "--show-error",
                "--max-time",
                "15",
                "https://api.ipify.org",
            ],
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
        if public_ip != args.expected_ip:
            raise RuntimeError(f"unexpected VPN egress IP: {public_ip}")
        subprocess.run(
            [
                "curl",
                "--socks5-hostname",
                proxy,
                "--fail",
                "--silent",
                "--show-error",
                "--head",
                "--max-time",
                "15",
                "https://example.com",
            ],
            stdout=subprocess.DEVNULL,
            check=True,
        )
    finally:
        if process is not None:
            process.terminate()
            try:
                process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=3)
        if config_path is not None:
            config_path.unlink(missing_ok=True)

    print(f"VLESS public route passed on TCP {args.external_port}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
