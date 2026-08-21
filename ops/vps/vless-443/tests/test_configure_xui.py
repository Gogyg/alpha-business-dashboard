import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "configure_xui.py"


class ConfigureXuiTest(unittest.TestCase):
    def test_routes_existing_reality_inbound_through_local_proxy_protocol(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            database_path = Path(temp_dir) / "x-ui.db"
            connection = sqlite3.connect(database_path)
            connection.execute(
                """
                CREATE TABLE inbounds (
                    id INTEGER PRIMARY KEY,
                    listen TEXT,
                    port INTEGER,
                    protocol TEXT,
                    stream_settings TEXT
                )
                """
            )
            original_settings = {
                "network": "tcp",
                "security": "reality",
                "realitySettings": {
                    "dest": "www.bing.com:443",
                    "privateKey": "unchanged-private-key",
                    "serverNames": ["www.bing.com"],
                },
                "tcpSettings": {
                    "acceptProxyProtocol": False,
                    "header": {"type": "none"},
                },
            }
            connection.execute(
                "INSERT INTO inbounds VALUES (?, ?, ?, ?, ?)",
                (1, "0.0.0.0", 2087, "vless", json.dumps(original_settings)),
            )
            connection.commit()
            connection.close()

            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "--db",
                    str(database_path),
                    "--inbound-port",
                    "2087",
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            connection = sqlite3.connect(database_path)
            listen, serialized_settings = connection.execute(
                "SELECT listen, stream_settings FROM inbounds WHERE id = 1"
            ).fetchone()
            connection.close()
            updated_settings = json.loads(serialized_settings)

            self.assertEqual(listen, "127.0.0.1")
            self.assertTrue(
                updated_settings["tcpSettings"]["acceptProxyProtocol"]
            )
            self.assertEqual(
                updated_settings["realitySettings"],
                original_settings["realitySettings"],
            )
            self.assertEqual(
                updated_settings["tcpSettings"]["header"],
                {"type": "none"},
            )


if __name__ == "__main__":
    unittest.main()
