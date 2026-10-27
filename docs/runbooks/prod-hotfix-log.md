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

## 2026-10-09 — HTTP upload limit for presentations
- Reason: nginx default request limit can block presentation files below the new 40 MiB application limit.
- Change: in `/etc/nginx/sites-enabled/alpha`, add `client_max_body_size 50m;` inside `location /storage/`. Back up resolved configuration to `/root/alpha-nginx-before-presentations-20261009.conf`; run `nginx -t` and reload nginx.
- Storage migration: apply `supabase/migrations/20261009_presentations_40mb.sql` via `docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1`. Global Storage FILE_SIZE_LIMIT is already 52428800 bytes.
- Validation: nginx config check; bucket file_size_limit=41943040; deployed presentations routes; authenticated PDF binary upload/read/delete smoke.
- Rollback: restore nginx backup and reload; restore bucket file_size_limit to NULL (previous value); deploy previous GitHub revision 8adf5ab and rebuild. MIME allowlist was NULL before the migration and remains NULL.

## 2026-10-27 — Bounded diagnostic log retention (Europe/Moscow)
- Reason: unbounded journald (~4.1 GiB) and Supabase Docker stdout logs (~3.3 GiB).
- Approved scope: journald 500 MiB / 14 days / 2 GiB free-space reserve; all 13 existing Supabase containers use json-file rotation at 20 MiB x 3. nginx retains its daily/14-archive policy. No application, database schema, VPN, proxy or image-version changes.
- Reproducible configuration: `ops/logging/journald.conf`, `ops/logging/compose.logging.yml`; procedure and rollback: `docs/runbooks/log-retention.md`.
- Target files: `/etc/systemd/journald.conf.d/60-alpha-retention.conf`, `/opt/supabase/docker/docker-compose.override.yml`. Run `systemctl restart systemd-journald`, `journalctl --rotate`, `journalctl --vacuum-time=14d --vacuum-size=500M`. Recreate Supabase services individually with `docker-compose up -d --no-deps --force-recreate --no-build --pull never SERVICE` after validating the resolved configuration changes only logging.
- Backup prepared before rollout: `/var/backups/alpha-dashboard/log-retention-20261027T192159Z` (root-only), containing globals, both database dumps, config/Storage archive, custom PostgreSQL config, Docker log archives and pre-change data fingerprints. Full archive blocks, tar/gzip integrity and SHA-256 manifest checked; this is not a full restore test. Offline PostgreSQL backup is required before db recreation.
- Additional maintenance: clear only npm download cache; stop the abandoned tcpdump PID 2313629 only after confirming its original start time/open file, and retain its capture. Do not prune images or delete replication files.
- Deployment/validation: applied and verified on the VPS; actual results follow below. Frontend dist remained byte-for-byte unchanged.
- Rollback: remove only the newly installed drop-in/override, restart journald and recreate affected services using the original Compose/image/mount configuration. Do not restore old databases over new writes. Expired system journal history is intentionally removed; Docker history is archived.

### Rollout results — 2026-10-27, completed around 22:33 Europe/Moscow
- Applied on VPS `2.26.106.1` from merged PR #17, commit `2a9d75a6fa1b9111f0456adcf9abad0c4f1fd0a1`; frontend `dist` hashes unchanged. No npm install/build was needed for this infrastructure-only change. Existing production `package-lock.json` modification and `.env.local.bak.20260421185512` were preserved.
- All 13 Supabase containers have live `json-file` options `max-size=20m`, `max-file=3`. For every recreated container, exact image ID, mounts, environment, commands, port bindings and network names matched the pre-change state. All previous health checks passed.
- Effective journald settings match the committed drop-in; journal usage is 480 MiB. nginx's existing daily/14-archive policy is unchanged.
- Cold PostgreSQL archive `postgres-data-offline.tgz` was created while db was stopped and subsequently read successfully. Total retained root-only backup directory: 427 MiB. Backups remain on the same VPS and have not undergone a full isolated restore; they are not protection against loss of that VPS.
- All 11 public-table counts/content fingerprints, Storage objects/buckets metadata and SHA-256 hashes of all 17 Storage files matched the pre-maintenance baseline after the probe was removed.
- Persistence probe: isolated KV record created via HTTPS REST before db restart; after restart verified by direct SQL and a new HTTPS GET, then deleted via REST and confirmed absent in SQL/REST. No test record remains. A pre-existing private Storage object was downloaded successfully.
- HTTPS smoke returned 200 for `/`, `/dashboard`, `/mbo`, `/events`, `/presentations`, `/auth/v1/health`, `/rest/v1/`, `/storage/v1/status`. Browser showed a rendered login page; authenticated browser editing/two-user UI scenarios were not tested. Route HTTP 200 alone verifies static delivery, not authenticated page contents.
- Amnezia and WhatsApp containers retained their exact IDs/start times. nginx, journald and x-ui are active; UDP 42692/51820, public TCP 443 and loopback 10443/2087 listeners remain present. VPN client end-to-end traffic was not tested.
- Stopped only abandoned tcpdump PID 2313629 (started 2026-08-22) using SIGINT after checking its open capture file. All `/root/vless-diag` files remain (1.4 GiB). Cleared npm download cache; `/root/.npm` now 232 KiB. No Docker images, volumes, user uploads or database files were manually deleted.
- PostgreSQL's normal restart/recovery reduced its own `pg_logical` directory from ~1.3 GiB to 11 MiB and WAL from ~705 MiB to 81 MiB. An active logical replication slot remains; no slot was manually dropped and no retention settings were changed.
- Disk used: 38,598,565,888 -> 29,088,858,112 bytes; net freed 9,509,707,776 bytes (~8.86 GiB), including retained backups. Available: 30,989,512,704 bytes (~28.86 GiB), root filesystem 49% used.
- Remaining scope: WhatsApp's tiny existing Docker log is still unbounded (its container was deliberately preserved); Logflare database history, image retention and one-time backup retention require their own policy. Vercel preview checks failed because the existing `supabase_url` secret reference is missing; Netlify preview succeeded. These integrations are separate from the verified VPS rollout and were not modified.
