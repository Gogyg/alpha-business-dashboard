# VLESS Reality TCP 443 SNI Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Share the VPS public TCP port `443` between `alfanib.ru` HTTPS and VLESS Reality while leaving AmneziaWG unchanged.

**Architecture:** nginx stream inspects the TLS SNI and proxies `dl.google.com` to loopback Xray while sending every other connection to an internal nginx HTTPS listener. PROXY protocol preserves client addresses across both loopback hops.

**Tech Stack:** nginx 1.18 stream/ssl_preread, 3x-ui 3.6.0, Xray 26.7.28, Python 3 sqlite3, Bash, systemd.

**Spec:** `docs/superpowers/specs/2026-08-21-vless-443-sni-routing-design.md`

## Global Constraints

- Do not alter AmneziaWG, UDP `42692`, WireGuard UDP `51820`, Supabase, or WhatsApp proxy.
- Do not store UUIDs, passwords, private keys, or panel credentials in Git.
- Deploy production only from GitHub `main`.
- Preserve the working `alfanib.ru` certificate, HTTP redirect, static SPA, and `/rest`, `/auth`, and `/storage` proxies.
- Every production mutation must have a timestamped backup and executable rollback.

---

### Task 1: Safe x-ui inbound updater

**Files:**
- Create: `ops/vps/vless-443/configure_xui.py`
- Test: `ops/vps/vless-443/tests/test_configure_xui.py`

**Interfaces:**
- Consumes: x-ui SQLite database path and internal inbound port.
- Produces: the same inbound bound to `127.0.0.1` with `acceptProxyProtocol=true`.

- [ ] Run the test before implementation and confirm it fails because `configure_xui.py` is absent.
- [ ] Implement strict single-inbound selection and transactional JSON update.
- [ ] Verify the focused unit test passes.
- [ ] Add missing-inbound and wrong-protocol tests and keep the suite green.

### Task 2: nginx routing templates and static validation

**Files:**
- Create: `ops/vps/vless-443/nginx/stream-443.conf`
- Create: `ops/vps/vless-443/nginx/alpha.conf`
- Create: `ops/vps/vless-443/tests/test_templates.py`

**Interfaces:**
- Consumes: public TCP `443`, loopback TCP `2087`, and loopback TCP `10443`.
- Produces: SNI routing with PROXY protocol and preserved website behavior.

- [ ] Write tests for exact SNI routing, default website routing, loopback-only HTTPS, and all existing API locations.
- [ ] Run the tests and confirm template assertions fail before templates exist.
- [ ] Add the minimal templates and verify tests pass.
- [ ] Validate the templates with production nginx using a temporary combined config and `nginx -t` before deployment.

### Task 3: Atomic deployment and rollback

**Files:**
- Create: `ops/vps/vless-443/deploy.sh`
- Create: `ops/vps/vless-443/rollback.sh`
- Create: `ops/vps/vless-443/smoke.sh`
- Test: `ops/vps/vless-443/tests/test_scripts.py`

**Interfaces:**
- Consumes: repository checkout on the VPS and root privileges.
- Produces: timestamped backup path, installed configuration, service transition, smoke result, and rollback command.

- [ ] Test required preflight, backup targets, nginx/xray validation, service order, smoke invocation, and rollback-on-failure markers.
- [ ] Run tests and confirm they fail before scripts exist.
- [ ] Implement scripts with `set -Eeuo pipefail`, explicit paths, and no secret output.
- [ ] Verify unit/static tests and shell syntax checks pass.

### Task 4: Documentation and GitHub delivery

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/runbooks/prod-hotfix-log.md`
- Create: `docs/adr/0003-vless-443-sni-routing.md`

**Interfaces:**
- Consumes: the selected architecture and exact deployment scripts.
- Produces: reproducible architecture, operational procedure, and rollback record.

- [ ] Document the traffic flow, ownership, constraints, verification, and rollback.
- [ ] Run all infrastructure tests and the frontend build.
- [ ] Commit only this branch's infrastructure and documentation files.
- [ ] Push the branch, merge through GitHub to `main`, and verify the merge commit.

### Task 5: Production rollout and end-to-end verification

**Files:**
- Deploy from: a clean release worktree at the exact GitHub `origin/main` commit
- Runtime: `/etc/nginx/nginx.conf`, `/etc/nginx/sites-available/alpha`, `/etc/nginx/stream-conf.d/443-sni-router.conf`, `/etc/x-ui/x-ui.db`

**Interfaces:**
- Consumes: GitHub `main`, existing x-ui Reality credentials, and production services.
- Produces: shared public TCP `443` with verified HTTPS and VLESS.

- [ ] Fetch GitHub `main` and create a clean release worktree without touching unrelated production files.
- [ ] Run deployment preflight and record the backup path.
- [ ] Deploy and require server-side smoke success.
- [ ] Run a real VLESS client from the Mac against public port `443` and verify public IP plus HTTPS.
- [ ] Confirm `alfanib.ru`, Supabase routes, certificate, nginx, x-ui, AmneziaWG, WireGuard, WhatsApp proxy, and existing listener inventory.
- [ ] If any required check fails, run rollback and verify the original website and public `2087` path are restored.
