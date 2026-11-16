# Temporary guest dashboard

The build-time setting `VITE_PUBLIC_DASHBOARD=true` opens dashboard routes to visitors. Guests can read the live dashboard, including presentations, and signed-in users keep their normal controls. The default build requires login.

## Enable

1. Build and test from GitHub main with `VITE_PUBLIC_DASHBOARD=true`.
2. Set `DISABLE_SIGNUP=true` in the Supabase Compose environment and restart only the `auth` service. Existing users can sign in; public self-registration would otherwise grant edit access.
3. Save the pre-change direct grants for `anon` on tables in the `public` schema and on `storage.objects` and `storage.buckets`. Run `ops/guest-dashboard/enable.sql` with `psql -v ON_ERROR_STOP=1`. It revokes guest writes and adds guest reads to MBO.
4. Publish the build and verify all sections with a fresh browser context. Check an anonymous database write is denied and authenticated editing rights remain.

## Restore required login

Rebuild from GitHub main with `VITE_PUBLIC_DASHBOARD=false` and publish that build. Drop policy `temporary_dashboard_guest_mbo_read` on `public.mbo_pages`. Restore the recorded grants and the previous value of `DISABLE_SIGNUP`, then recreate only Supabase `auth`. Perform a smoke test with a clean browser session. Keep guest mode enabled until the operator requests restoration.
