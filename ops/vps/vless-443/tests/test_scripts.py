import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class OperationalScriptsTest(unittest.TestCase):
    def read_script(self, name: str) -> str:
        path = ROOT / name
        self.assertTrue(path.is_file(), f"{name} is missing")
        return path.read_text()

    def test_deploy_has_backup_validation_and_automatic_rollback(self):
        deploy = self.read_script("deploy.sh")

        self.assertIn("set -Eeuo pipefail", deploy)
        self.assertIn("/root/backups/vless-443-", deploy)
        self.assertIn("trap rollback_on_error ERR", deploy)
        self.assertIn("cp -a /etc/nginx/nginx.conf", deploy)
        self.assertIn("sqlite3", deploy)
        self.assertIn("/etc/x-ui/x-ui.db", deploy)
        self.assertIn("configure_xui.py", deploy)
        self.assertIn("--reality-server-name", deploy)
        self.assertIn('"dl.google.com"', deploy)
        self.assertIn("nginx -t", deploy)
        self.assertIn("systemctl restart x-ui", deploy)
        self.assertIn("waiting for Xray listener on 127.0.0.1:2087", deploy)
        self.assertIn("Xray listener did not start on 127.0.0.1:2087", deploy)
        self.assertIn("ss -H -lnt '( sport = :2087 )'", deploy)
        self.assertIn("systemctl reload nginx", deploy)
        self.assertIn('"$SCRIPT_DIR/smoke.sh"', deploy)
        self.assertIn("origin/main", deploy)
        self.assertIn("status --porcelain --untracked-files=all", deploy)
        self.assertIn('"$SCRIPT_DIR/smoke_baseline.sh"', deploy)
        self.assertIn("CRITICAL: automatic rollback failed", deploy)
        self.assertNotIn('rollback.sh" "$BACKUP_DIR" || true', deploy)

    def test_rollback_restores_nginx_and_xui(self):
        rollback = self.read_script("rollback.sh")

        self.assertIn("cp -a", rollback)
        self.assertIn("nginx.conf", rollback)
        self.assertIn("x-ui.db", rollback)
        self.assertIn("systemctl restart x-ui", rollback)
        self.assertIn("x-ui.db-wal", rollback)
        self.assertIn("x-ui.db-shm", rollback)
        self.assertIn("PRAGMA integrity_check", rollback)
        self.assertIn("nginx -t", rollback)
        self.assertIn("systemctl reload nginx", rollback)
        self.assertIn('"$SCRIPT_DIR/smoke_baseline.sh"', rollback)

    def test_smoke_covers_site_xray_and_untouched_services(self):
        smoke = self.read_script("smoke.sh")

        for marker in (
            "https://alfanib.ru/",
            "/auth/v1/health",
            "127.0.0.1:2087",
            "127.0.0.1:10443",
            "amnezia-awg2",
            ":42692",
            ":51820",
            "supabase-kong",
            "whatsapp-proxy",
            "/rest/v1/",
            "/storage/v1/bucket",
            "smoke_vless.py",
            "container-state.txt",
            "tcp-state.txt",
        ):
            self.assertIn(marker, smoke)

        self.assertIn('[[ "$auth_status" == "401" ]]', smoke)
        self.assertIn('[[ "$rest_status" == "401" ]]', smoke)
        self.assertIn('[[ "$storage_status" == "400" ]]', smoke)

    def test_vless_smoke_uses_public_route_without_printing_secrets(self):
        vless_smoke = self.read_script("smoke_vless.py")

        self.assertIn("/usr/local/x-ui/bin/config.json", vless_smoke)
        self.assertIn("x25519", vless_smoke)
        self.assertIn("--socks5-hostname", vless_smoke)
        self.assertIn("https://api.ipify.org", vless_smoke)
        self.assertIn("https://example.com", vless_smoke)
        self.assertIn("NamedTemporaryFile", vless_smoke)
        self.assertIn("unlink", vless_smoke)
        self.assertIn("def run_curl", vless_smoke)
        self.assertIn("attempts: int = 3", vless_smoke)

    def test_baseline_checks_current_site_and_vless_before_mutation(self):
        baseline = self.read_script("smoke_baseline.sh")

        self.assertIn("https://alfanib.ru/", baseline)
        self.assertIn("--external-port 2087", baseline)
        self.assertIn("smoke_vless.py", baseline)


if __name__ == "__main__":
    unittest.main()
