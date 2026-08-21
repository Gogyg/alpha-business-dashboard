#!/usr/bin/env python3
"""Route one existing x-ui VLESS Reality inbound through nginx stream."""

import argparse
import json
import sqlite3
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--inbound-port", type=int, required=True)
    parser.add_argument("--reality-server-name", required=True)
    return parser.parse_args()


def configure(database_path: Path, inbound_port: int, reality_server_name: str) -> int:
    if not database_path.is_file():
        raise ValueError(f"x-ui database does not exist: {database_path}")

    connection = sqlite3.connect(database_path)
    try:
        connection.execute("BEGIN IMMEDIATE")
        rows = connection.execute(
            """
            SELECT id, protocol, stream_settings
            FROM inbounds
            WHERE port = ?
            """,
            (inbound_port,),
        ).fetchall()
        if len(rows) != 1:
            raise ValueError(
                f"expected one inbound on port {inbound_port}, found {len(rows)}"
            )

        inbound_id, protocol, serialized_settings = rows[0]
        if protocol != "vless":
            raise ValueError(
                f"inbound on port {inbound_port} is {protocol}, expected vless"
            )

        settings = json.loads(serialized_settings)
        if settings.get("security") != "reality":
            raise ValueError(
                f"inbound on port {inbound_port} does not use Reality security"
            )

        tcp_settings = settings.setdefault("tcpSettings", {})
        tcp_settings["acceptProxyProtocol"] = True
        reality_settings = settings.setdefault("realitySettings", {})
        reality_settings["dest"] = f"{reality_server_name}:443"
        reality_settings["serverNames"] = [reality_server_name]
        connection.execute(
            """
            UPDATE inbounds
            SET listen = ?, stream_settings = ?
            WHERE id = ?
            """,
            (
                "127.0.0.1",
                json.dumps(settings, separators=(",", ":")),
                inbound_id,
            ),
        )
        connection.commit()
        return inbound_id
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def main() -> int:
    args = parse_args()
    try:
        inbound_id = configure(
            args.db,
            args.inbound_port,
            args.reality_server_name,
        )
    except (ValueError, json.JSONDecodeError, sqlite3.Error) as error:
        print(f"configure_xui: {error}", file=sys.stderr)
        return 1

    print(f"configured x-ui inbound id={inbound_id} port={args.inbound_port}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
