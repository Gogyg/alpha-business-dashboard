# Production Hotfix Log

## Purpose
This log is mandatory for any manual changes made directly on production infrastructure (VPS), outside normal Git-tracked application code.

## Entry Format
- Date/time (timezone)
- Incident/symptom
- Root cause
- Exact change on production (files/commands)
- Validation result
- Rollback note

---

## 2026-04-21 (Europe/Moscow)

### 1) Storage upload failed (`Not Allowed`) for presentations
- Incident/symptom:
  - Creating presentation package failed with `Storage upload failed ... Not Allowed`.
- Root cause:
  - Public domain `alfanib.ru` reverse proxy had routes for `/rest/` and `/auth/`, but no `/storage/` proxy to Supabase gateway.
- Exact production change:
  - File: `/etc/nginx/sites-enabled/alpha`
  - Added block:
    - `location /storage/ { proxy_pass http://127.0.0.1:8000/storage/; ... }`
    - with forwarded auth headers:
      - `proxy_set_header apikey $http_apikey;`
      - `proxy_set_header Authorization $http_authorization;`
  - Reloaded nginx after syntax check:
    - `nginx -t`
    - `systemctl reload nginx`
- Validation:
  - Test upload to `https://alfanib.ru/storage/v1/object/...` returned HTTP `200`.
  - Presentation creation/upload started working in UI.
- Rollback note:
  - Restore backup of `/etc/nginx/sites-enabled/alpha` created before edit and reload nginx.

### 2) Frontend endpoint mismatch and browser fetch errors
- Incident/symptom:
  - After temporary URL switch, browser showed `TypeError: Failed to fetch`.
- Root cause:
  - HTTPS app attempted direct HTTP API URL in browser (mixed content/network restriction path).
- Exact production change:
  - File: `/var/www/alpha-dashboard/.env.local`
  - Set:
    - `VITE_SUPABASE_URL=https://alfanib.ru`
  - Rebuilt frontend:
    - `cd /var/www/alpha-dashboard && npm run build`
- Validation:
  - Built bundle contains `https://alfanib.ru` as Supabase base URL.
  - Storage endpoint reachable via domain proxy.
- Rollback note:
  - Restore previous `.env.local` backup and rebuild.

---

## 2026-08-21 (Europe/Moscow)

### VLESS Reality and `alfanib.ru` shared public TCP 443
- Incident/symptom:
  - The existing VLESS Reality inbound used public TCP `2087`, while router clients required TCP `443`.
  - Public TCP `443` was already owned by nginx for `alfanib.ru`.
- Root cause:
  - Two independent TCP services cannot bind the same public address and port without a protocol-aware front router.
- Exact production change:
  - GitHub PRs: `#7` (deployment and routing) and `#8` (Xray listener readiness check).
  - Production release commit: `d65a121e01cd6e5d126a97e5eb3649e8e8b96a14`.
  - Deployment command from a clean detached `origin/main` worktree:
    - `./ops/vps/vless-443/deploy.sh`
  - nginx stream now owns public TCP `443` and routes by TLS SNI:
    - VLESS Reality SNI to Xray on `127.0.0.1:2087`.
    - all other SNI values to nginx HTTPS on `127.0.0.1:10443`.
  - PROXY protocol is enabled on both internal routes.
  - x-ui inbound `1` was restricted to loopback and configured to accept PROXY protocol.
  - Final backup: `/root/backups/vless-443-20260821-154816`.
  - Two earlier attempts rolled back automatically because x-ui reported active before Xray opened its listener. PR `#8` added a bounded readiness wait before smoke testing.
- Validation:
  - Infrastructure tests passed `8/8` on the VPS release worktree.
  - `nginx -t`, nginx, x-ui, site, auth, REST, and storage smoke checks passed.
  - VLESS traffic through public TCP `443` returned external IP `2.26.106.1`; external macOS Xray check reached `https://example.com` with HTTP `200`.
  - Public TCP `443` is owned by nginx; nginx HTTPS listens on `127.0.0.1:10443`; Xray listens on `127.0.0.1:2087` only.
  - `amnezia-awg2`, `supabase-kong`, and `whatsapp-proxy` retained their container identities and running state.
  - AmneziaWG UDP `42692` and WireGuard UDP `51820` listeners remained available.
- Rollback note:
  - Run `/tmp/alpha-vless-release-d65a121/ops/vps/vless-443/rollback.sh /root/backups/vless-443-20260821-154816`.
  - Rollback restores nginx and the x-ui SQLite backup, removes SQLite WAL sidecars, verifies database integrity, and reruns the original HTTPS and public TCP `2087` VLESS baseline.

### Reality SNI changed to `dl.google.com`
- Exact production change:
  - GitHub PRs `#10`, `#11`, and `#12`; release commit `ad75ac7e2719716048e589d9abb19bc06ad3ee6c`.
  - nginx stream SNI, Reality destination, and Reality server name changed from `www.bing.com` to `dl.google.com`.
  - UUID, Reality key pair, short ID, ports, and AmneziaWG configuration were not changed.
  - Backup: `/root/backups/vless-443-20260821-sni-google`.
- Validation:
  - External macOS Xray client returned egress IP `2.26.106.1` and HTTP `200` from `https://example.com`.
  - `alfanib.ru` returned HTTPS `200` with successful certificate verification.
  - nginx and x-ui were active; TCP `443`, loopback `10443` and loopback `2087` listeners were present.
  - Protected container identities and UDP `42692`/`51820` listeners were unchanged.
- Rollback note:
  - Run `/tmp/alpha-vless-release-ad75ac7/ops/vps/vless-443/rollback.sh /root/backups/vless-443-20260821-sni-google`.
