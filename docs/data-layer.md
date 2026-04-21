# Data Layer

## Supabase Components
- Postgres: shared metadata and structured state.
- Storage: HTML pages and asset files for presentations.
- Auth: authenticated role for data access.

## Tables (key)
- `events`
- `menu_config`
- `ksh_cdpo_dashboards`
- `ksh_cdpo_widgets`
- `presentations_packages`

## Presentations Persistence Model

### Postgres (`presentations_packages`)
Stores package metadata and file references.

Main columns:
- `id`
- `title`
- `event_date`
- `is_recurring`
- `data` (JSONB, with `pages[]` and `assets[]` metadata)
- `created_at`, `updated_at`

### Storage bucket (`presentations`)
Stores actual files.

Path conventions:
- pages: `<package-id>/pages/<file-id>/<fileName>`
- assets: `<package-id>/assets/<file-id>/<fileName>`

## Security
- RLS enabled on metadata tables.
- Storage policies scoped to bucket and authenticated users.

## Migrations
- Add new schema/policy changes in `supabase/migrations/*`.
- Keep `schema.sql` aligned as baseline reference.

## Anti-Pattern
Do not keep shared business data only in `localStorage`.
`localStorage` is only for per-browser transient UI state.
