# Production diagnostic log retention

## Scope and architecture

The frontend is static output at `/var/www/alpha-dashboard/dist`. Shared business
data is in the existing self-hosted Supabase PostgreSQL and Storage mounts under
`/opt/supabase/docker`. Diagnostic history must not grow without a limit.

This change affects journald and the 13 services of the existing `supabase`
Compose project. It does not update images, alter database schemas, remove
PostgreSQL WAL/replication snapshots, or recreate Amnezia/WhatsApp containers.
WhatsApp's existing Docker log remains outside this change and has no size limit;
apply a separate reviewed change to its owner configuration before recreating it.

## Policy

| Source | Policy |
| --- | --- |
| Persistent system journal | `SystemMaxUse=500M`, `SystemKeepFree=2G`, `MaxRetentionSec=14day` |
| Volatile system journal | `RuntimeMaxUse=100M` |
| Each Supabase Docker service | `json-file`, `max-size=20m`, `max-file=3` |
| nginx | Existing daily rotation, 14 archives, compression |
| Amnezia | Existing Docker log driver `none`, unchanged |

The time limit is a maximum, not a guarantee of 14 days of history: size/space
limits can expire records sooner. Docker's limit is about 60 MiB per container,
with active-record overhead. Existing containers require recreation for it to
take effect. Keep `json-file` for compatibility with the existing Vector source.

Files in this repository contain no secrets:

- `ops/logging/journald.conf` installs as `/etc/systemd/journald.conf.d/60-alpha-retention.conf`.
- `ops/logging/compose.logging.yml` installs as `/opt/supabase/docker/docker-compose.override.yml`.

The standard `docker-compose` invocation in `/opt/supabase/docker` automatically
loads the override. If using explicit `-f`, include both files; using only the
base file drops the policy. Add the same logging block for any new service.

## Deployment and protection of data

1. Merge the narrowly scoped configuration/documentation PR to GitHub `main`.
   Fast-forward the production checkout without discarding unrelated local
   files. No frontend rebuild is necessary for these infrastructure-only assets;
   verify the deployed `dist` checksum remains unchanged.
2. Record service/image IDs, container inspection, mounts, resolved Compose
   configuration, disk use, public-table counts/fingerprints, and Storage file
   SHA-256 hashes. Store sensitive inspection/configuration output only on the
   VPS in a root-only directory (`umask 077`).
3. Under `/var/backups/alpha-dashboard/log-retention-<UTC timestamp>/`, save
   PostgreSQL globals, custom-format dumps of `postgres` and `_supabase`, the
   Compose configuration and `.env`, Storage files, initialization SQL and
   the `supabase_db-config` named volume. Read all dump archive blocks with
   `pg_restore --file=/dev/null`; verify tar/gzip archives and SHA-256 sums.
   This archive check alone is not a complete test restoration.
4. Preserve existing Supabase Docker logs as compressed root-only archives
   before recreation. They may contain sensitive information. Preserve the
   original configuration for rollback. Do not publish archives or secrets.
5. Compare effective Compose configuration and running containers. Confirm
   exact image IDs, environment, commands (accounting for Compose `$$` escapes),
   mounts, networks and port bindings. Stop if unrelated configuration drift is
   found. Confirm no override existed before installing this one.
6. Install the journald drop-in, restart only `systemd-journald`, then run
   `journalctl --rotate` and `journalctl --vacuum-time=14d --vacuum-size=500M`.
   This intentionally expires old system diagnostic history, not site data.
7. Install the Compose override and validate privately with
   `docker-compose config --format json` (it contains secrets; do not print it).
   The resolved services must differ only in `logging`.
8. Recreate only the existing Supabase services with current local images:
   `docker-compose up -d --no-deps --force-recreate --no-build --pull never SERVICE`.
   Work one service at a time and check running/healthy state. Do not run
   `down`, `down -v`, volume prune, image prune, or `--remove-orphans`.
   Before recreating `db`, stop it gracefully and additionally archive its
   offline `volumes/db/data` directory. Immediately bring it back using the
   same image and original mounts. API/database availability is briefly
   interrupted; nginx and VPN continue running.
9. Remove only the npm download cache with `npm cache clean --force`. Do not
   remove `node_modules`, package locks, uploads, backup files, or images used
   by other projects. An old packet capture may be stopped only after matching
   its PID, start time and open file; preserve the captured file.

## Verification and limitations

Check effective journald settings, journal usage, all 13 live Docker logging
configurations, identical image IDs and mounts, all previous health states,
nginx and HTTPS routes, Auth/API/Storage endpoints, business-table fingerprints,
Storage file hashes, and database-backed read/write/reread with a temporary
isolated probe that is removed afterward. Record any concurrent legitimate data
changes rather than restoring old snapshots over them. A server/API persistence
probe does not prove authenticated browser editing; report that coverage
separately. Confirm Amnezia/WhatsApp container IDs/start times are unchanged.

One-time archives also consume space and do not inherit journald/Docker rotation.
Do not schedule automatic backup deletion without an agreed recovery policy.
Record the retained backup size and final free disk space in the rollout report.
PostgreSQL replication retention needs separate diagnosis, never filesystem
deletion. Logflare's database history is separate from Docker stdout logs.

## Rollback

Restore the previous journald configuration (or remove only the newly installed
drop-in), then restart `systemd-journald`. Remove only the new Compose override
and recreate affected services using the original Compose file and exact image
IDs. Keep all data mounts and named volumes. Removed system history cannot be
recovered; archived Docker history remains in the backup directory. Do not
restore a full database backup over newer user writes for a logging rollback.
