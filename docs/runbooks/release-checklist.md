# Release Checklist

## Goal
Prevent regressions and ensure production behavior is shared and correct for all users.

## Pre-merge (local)
1. Run `npm run build`.
2. Smoke-check core routes and critical UI states.
3. Validate changed feature with at least one create/edit/read cycle.
4. Confirm no accidental local-only persistence for shared data.

## Shared Data Validation (mandatory)
For features intended to be shared between users:
1. Create/update data as User A.
2. Open app as User B (different session/browser/account).
3. Verify User B sees the same data/state.
4. Verify data reload after full browser refresh.

Fail release if behavior is only visible in one browser session.

## Database/Storage Changes
1. Add migration file in `supabase/migrations`.
2. Ensure `schema.sql` is updated for baseline consistency.
3. Verify RLS and Storage policies are present.
4. Apply migration in target environment before/with rollout.

## Deploy (production VPS)
1. Merge to `main` on GitHub.
2. On VPS run:
   - `git pull`
   - `npm install`
   - `npm run build`
3. Check current SHA on VPS matches expected commit.

## Manual VPS Changes (mandatory)
If release or incident handling included manual server changes (for example `nginx`, `.env.local`, system config, DB policy patches):
1. Record each manual change in `docs/runbooks/prod-hotfix-log.md`.
2. Include: date/time, reason, exact file/command changed, and rollback note.
3. Ensure next maintainer can reproduce the environment from docs.

## Post-deploy Smoke
1. Open key routes and verify page load.
2. Re-check shared data behavior with two users.
3. Verify no critical console/API errors.
4. If issue found, rollback to previous known SHA.
