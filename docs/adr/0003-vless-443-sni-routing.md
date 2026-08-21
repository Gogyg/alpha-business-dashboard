# ADR 0003: Share TCP 443 with SNI routing

## Status

Accepted on 2026-08-21.

## Context

The dashboard already terminates HTTPS on public TCP `443`. A router-based
VLESS Reality client may require the standard TCP `443` port, while the
existing public TCP `2087` path is not sufficiently compatible. AmneziaWG is
an independent working service and must not be changed.

## Decision

Use nginx stream with `ssl_preread` as the only public TCP `443` listener.
Route Reality SNI `www.bing.com` to loopback Xray and route all other SNI values
to the loopback nginx HTTPS virtual host. Send PROXY protocol to both backends
to preserve client addresses. Bind Xray to loopback after the cutover.

## Consequences

- The website and VLESS share one IP and one public TCP port.
- TLS remains end-to-end to the selected backend; stream does not terminate it.
- Unknown SNI values default to the website path, preserving ordinary HTTPS
  behavior.
- nginx stream becomes a critical dependency for both services.
- The Xray share URL must use external port `443`, although x-ui retains
  internal port `2087`.
- Production changes require the tracked deployment script and a fresh backup.

## Rejected alternatives

- Moving VLESS directly to TCP `443` would displace `alfanib.ru`.
- Moving AmneziaWG to UDP `443` does not satisfy the VLESS requirement.
- Keeping only TCP `2087` does not address router or provider restrictions.
- A second public IP is operationally simpler but is not currently available.
