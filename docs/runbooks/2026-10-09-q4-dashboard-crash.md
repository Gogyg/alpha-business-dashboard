# Q4 dashboard crash — 2026-10-09

Status: diagnosed live; release approved by the owner; deployment validation is recorded separately below.

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
