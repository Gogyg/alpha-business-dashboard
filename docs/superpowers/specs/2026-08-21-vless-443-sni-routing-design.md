# VLESS Reality and alfanib.ru on TCP 443

## Goal

Serve the existing `alfanib.ru` HTTPS application and a new VLESS Reality
inbound through the VPS public TCP port `443`, without modifying AmneziaWG or
its UDP ports.

## Current state

- nginx terminates TLS for `alfanib.ru` and `www.alfanib.ru` on TCP `443`.
- Xray listens on TCP `2087` with VLESS, Reality, and Vision.
- The Reality target and client SNI are `www.bing.com`.
- nginx has the dynamic stream module and TLS SNI support enabled.
- TCP `8443` and `1443` are already occupied; `127.0.0.1:10443` is free.
- AmneziaWG uses UDP `42692` and is outside this change.

## Selected architecture

nginx becomes a TCP SNI multiplexer on public port `443`. It reads the TLS
ClientHello without terminating it and selects one of two loopback backends:

```text
Internet TCP 443
        |
        v
nginx stream + ssl_preread
        |
        +-- SNI www.bing.com ----------> 127.0.0.1:2087 (Xray Reality)
        |
        +-- every other SNI/default ---> 127.0.0.1:10443 (nginx HTTPS)
```

The stream proxy sends PROXY protocol v1 to both backends. The internal nginx
HTTPS listener trusts PROXY protocol only from loopback and restores the real
client IP. Xray accepts PROXY protocol and binds its inbound to loopback, so
the old public `2087` path is removed after the switch.

## Configuration ownership

- Git tracks the nginx stream route, the complete `alpha` virtual host, the
  x-ui database updater, deployment script, smoke checks, and rollback steps.
- Runtime secrets remain only in `/etc/x-ui/x-ui.db`; no UUID or Reality key is
  committed.
- Production deployment is made only from a commit merged to GitHub `main`.

## Deployment safety

1. Verify nginx, x-ui, the current website, and current VLESS before changes.
2. Back up nginx configuration and `/etc/x-ui/x-ui.db` under a timestamped
   directory in `/root/backups`.
3. Install files but validate nginx before reloading it.
4. Update only the x-ui inbound on internal port `2087`: bind to loopback and
   enable PROXY protocol. Preserve all Reality and client data.
5. Restart x-ui, reload nginx, then run website, certificate, API, listener,
   unchanged-service comparisons, and a real VLESS handshake through public
   TCP `443`.
6. Roll back nginx and x-ui automatically if the server-side smoke check fails.

## Verification requirements

- `nginx -t` succeeds.
- `xray run -test` succeeds.
- Public `https://alfanib.ru/` returns HTTP `200` with the existing certificate.
- Public `/rest/v1/` reaches the existing Supabase proxy rather than nginx
  default content.
- A VLESS client using public port `443`, SNI `www.bing.com`, and the existing
  credentials reaches an HTTPS endpoint and reports public IP `2.26.106.1`.
- TCP `2087` no longer listens publicly.
- AmneziaWG container, UDP `42692`, WireGuard UDP `51820`, WhatsApp proxy, and
  Supabase listeners remain unchanged.

## Rollback

Restore the timestamped nginx files and x-ui database, restart x-ui, validate
nginx, and reload nginx. Rollback returns the website to direct TCP `443` and
VLESS to public TCP `2087`.
