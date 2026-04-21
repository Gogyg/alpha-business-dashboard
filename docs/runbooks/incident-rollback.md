# Incident and Rollback Runbook

## When to trigger
- Production feature broken for users.
- Shared data not visible across users.
- Critical route unavailable after deploy.

## Immediate triage
1. Identify affected route/feature.
2. Confirm current VPS commit SHA.
3. Check if issue is frontend-only or data-layer/policy/migration related.

## Fast rollback (code)
1. Pick previous known-good SHA from `main` history.
2. On VPS:
   - `cd /var/www/alpha-dashboard`
   - `git fetch origin`
   - `git reset --hard <known-good-sha>`
   - `npm install`
   - `npm run build`
3. Verify critical routes and shared behavior.

## Roll forward (preferred if fix is quick)
1. Create hotfix commit on `main`.
2. Deploy with standard VPS process.
3. Validate with smoke checks.

## Data safety notes
- Do not run destructive DB cleanup without explicit approval.
- If migration caused issue, prefer reversible migration or guarded patch.
- Preserve user data first; restore functionality second.

## Mandatory post-incident actions
1. Add/update ADR if architecture decision changed.
2. Update release checklist if a new failure mode was found.
3. Record root cause and prevention note in docs.
