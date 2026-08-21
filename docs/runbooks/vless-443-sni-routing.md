# VLESS Reality and alfanib.ru on TCP 443

## Scope

This runbook deploys the tracked nginx SNI router and moves the existing x-ui
VLESS Reality inbound behind loopback. It does not modify AmneziaWG, WireGuard,
Supabase, or WhatsApp proxy.

## Preconditions

Run from a clean checkout or release worktree after the deployment commit is
merged to GitHub `main`. The deploy script fetches `origin/main`, requires its
own `HEAD` to equal that commit, and rejects any tracked or untracked files.
This allows the production application checkout to retain unrelated local
state without becoming the source of the infrastructure rollout.

```bash
cd /path/to/clean/alpha-dashboard-release
python3 -m unittest discover -s ops/vps/vless-443/tests -v
bash -n ops/vps/vless-443/deploy.sh \
  ops/vps/vless-443/rollback.sh \
  ops/vps/vless-443/smoke.sh
sudo ops/vps/vless-443/deploy.sh
```

The deploy command prints the timestamped backup directory and exact rollback
command. Keep that terminal open through client verification.

## Client settings

Keep the existing UUID, Reality public key, short ID, flow, and fingerprint.
Change only the external port to `443`; keep SNI `www.bing.com`. The internal
x-ui inbound remains on `2087` and must not be exposed in the router profile.

## Verification

Server-side checks automatically exercise VLESS through the public route using
credentials read from the active Xray config in memory. The temporary client
config is mode `0600` and deleted after the test. Complete the rollout with a
second real client, preferably the target router:

```bash
curl https://api.ipify.org
curl -I https://example.com
```

Expected through VLESS: public IP `2.26.106.1` and a successful HTTPS status.
Also verify `https://alfanib.ru`, authentication, dashboard data reads, and a
storage request from the deployed application.

## Rollback

Use the exact backup path printed by deployment:

```bash
sudo /path/to/clean/alpha-dashboard-release/ops/vps/vless-443/rollback.sh \
  /root/backups/vless-443-YYYYMMDD-HHMMSS
```

Rollback restores direct nginx HTTPS on public TCP `443`, restores the x-ui
database, and returns VLESS to its previous public TCP `2087` listener.
