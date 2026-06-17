## Best practices for developing on VPS

- Production source of truth is the VPS deployment at `/var/www/alpha-dashboard`.
- Deploy to production only through GitHub: merge to `main`, then update the VPS checkout and rebuild there.
- Do not describe or propose reserve hosting paths in project docs unless the user explicitly asks for them.
- Keep environment secrets on the server or in the agreed deployment environment, never in git or public client variables beyond the required `VITE_*` runtime values.
- Treat the frontend build as static output: no background daemons, writable local state, or server-side persistence assumptions.
- Any shared business data must live in Supabase/VPS-backed storage, not in browser-only state.
- After each production rollout, smoke-check the key routes and shared-data behavior directly against the deployed app.
