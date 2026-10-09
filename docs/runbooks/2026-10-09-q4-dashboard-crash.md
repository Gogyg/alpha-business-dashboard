# Q4 dashboard crash — 2026-10-09

Status: deployed through GitHub PR #14 on 2026-10-09; production checks completed with the authorization limitations listed below.

## Evidence

Production commit: c604edb. Nginx active; root disk 57% used. Served asset
`index-CHaSZilJ.js`, line 444 column 116549, reads `enpsData.value` in RedCapPage.
Read-only SQL confirmed the Q4 voc_metrics JSON contains only livingDashboardFocus;
Q1/Q2/Q3 include enpsData and visibilityData.
LivingDashboard.saveFocusConfig can legitimately create a focus-only quarter.
RedCapPage previously treated any non-null JSON as a complete dashboard.

## Fix and data behavior

withDashboardDefaults fills absent/null top-level fields from the existing quarter
schema and fills missing eNPS/visibility properties. Existing values, zero values,
empty arrays and livingDashboardFocus are preserved. Applied at load and latest
snapshot preparation for conflict-aware saves. Loading does not write to the DB;
normal saves still use the existing Supabase persistence path.
No database migration or manual production data update is required.

## Verification

Node regression: original focus-only input failed on `.value`; all three tests
pass after fix. `npm run build` passed (existing large-chunk warning).
Browser smoke uses RedCapPage with a focus-only Q4 fixture and an unreachable
loopback Supabase URL; no production access or write. Metrics, eNPS 0/85 and
visibility 0/358 render without route error. Desktop/mobile viewport checks were
performed; mobile DOM width 390 equals viewport width. Authenticated production
smoke and password-gated editing remain to be verified after deployment.
Impeccable detector reports an existing gradient-text warning outside this fix.

## Release and rollback

Release contains only Dashboard loading/snapshot normalization, its helper and regression tests, and incident documentation.
The working checkout contains unrelated pre-existing modifications; do not deploy
its entire diff. Apply the scoped fix to a clean GitHub branch, review/merge into
main, then pull and rebuild /var/www/alpha-dashboard. Record resulting commit.
Smoke-check initial entry and Q4 dashboard, previous quarters and shared saves.
Rollback by reverting the fix through GitHub and rebuilding the VPS checkout.

## Deployment result

- GitHub PR: https://github.com/Gogyg/alpha-business-dashboard/pull/14 (merged).
- Deployed code commit: `cc8ad105565b50ad895faf1a3003cb8d7045bbe5`.
- Backup: `/root/backups/alpha-q4-crash-20261009` (previous dist, commit, working-tree patch, package-lock and DB checksums).
- VPS Vite build passed using Node 20.20.2; npm dependencies and server environment were not changed. Built in a separate directory, then switched dist. Old JS assets were retained for existing tabs.
- Live HTTPS `/`, `/login`, `/dashboard`, `/living-dashboard`, `/mbo`, `/ksh-cdpo`, and old asset all returned 200. New entry asset is `index-BUMU3qlg.js`. nginx remained active.
- voc_metrics checksums before/after deployment are identical; no DB write or migration occurred.
- Exact old deployed bundle reproduced the original crash at HB / line 444 / column 116550 with the focus-only Q4 fixture. Exact new bundle downloaded from production rendered the same fixture without the route error. All API traffic in replay was mocked and actual backend connections blocked.
- Desktop 1280x720 and mobile 390x844 checked in view mode. A pre-existing 2px mobile overflow and unavailable logo in the isolated replay are outside the data-loading fix.
- Live browser displays the login page. Authenticated live dashboard, password-gated editing and cross-user save behavior were not tested; the persistence API was not changed.
- GitHub external Vercel status checks failed and Netlify preview was pending. No GitHub Actions workflow runs were present; local and target VPS builds passed.

For immediate rollback of static output, preserve current dist under a new backup name and copy the saved `dist` from the backup to `/var/www/alpha-dashboard/dist`. Then revert the fix through GitHub and update the checkout to match. Do not alter the server environment, package-lock or DB during rollback.
