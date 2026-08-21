import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STREAM_TEMPLATE = ROOT / "nginx" / "stream-443.conf"
ALPHA_TEMPLATE = ROOT / "nginx" / "alpha.conf"


class NginxTemplateTest(unittest.TestCase):
    def test_stream_routes_reality_sni_and_defaults_to_site(self):
        self.assertTrue(STREAM_TEMPLATE.is_file(), "stream template is missing")
        stream = STREAM_TEMPLATE.read_text()

        self.assertIn("dl.google.com xray_reality;", stream)
        self.assertNotIn("www.bing.com", stream)
        self.assertIn("default alfanib_https;", stream)
        self.assertIn("server 127.0.0.1:2087;", stream)
        self.assertIn("server 127.0.0.1:10443;", stream)
        self.assertIn("listen 443;", stream)
        self.assertIn("ssl_preread on;", stream)
        self.assertIn("proxy_protocol on;", stream)

    def test_site_is_loopback_only_and_accepts_proxy_protocol(self):
        self.assertTrue(ALPHA_TEMPLATE.is_file(), "alpha template is missing")
        alpha = ALPHA_TEMPLATE.read_text()

        self.assertIn("listen 127.0.0.1:10443 ssl proxy_protocol;", alpha)
        self.assertNotIn("listen 443 ssl", alpha)
        self.assertIn("set_real_ip_from 127.0.0.1;", alpha)
        self.assertIn("real_ip_header proxy_protocol;", alpha)
        self.assertIn("location /rest/", alpha)
        self.assertIn("location /auth/", alpha)
        self.assertIn("location /storage/", alpha)
        self.assertIn("listen 80;", alpha)


if __name__ == "__main__":
    unittest.main()
