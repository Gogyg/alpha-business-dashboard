# Architecture

## Overview
`alpha-business-dashboard` is a React + Vite + TypeScript web app with Supabase as the shared backend.

## Runtime Components
- Frontend SPA: React app (routes, widgets, dashboards, presentations UI).
- Backend services: Supabase Postgres + Supabase Storage + Supabase Auth.
- Production hosting: VPS (`/var/www/alpha-dashboard`) serving built static assets.

## Main Data Domains
- `events` (singleton-style shared events model).
- `menu_config` (shared menu structure/config).
- `ksh_cdpo_dashboards` / `ksh_cdpo_widgets`.
- `presentations_packages` (metadata for presentation packages).
- Storage bucket `presentations` (HTML pages and assets for presentation packages).

## Presentations Architecture
### Metadata (Postgres)
Table: `public.presentations_packages`
- `id` (UUID)
- `title` (TEXT)
- `event_date` (DATE, nullable)
- `is_recurring` (BOOLEAN)
- `data` (JSONB with file metadata lists)
- `created_at`, `updated_at`

`data` contains references only (file IDs, file names, storage paths, mime, encoding).
Raw HTML/assets are not stored in Postgres.

### Content Files (Storage)
Bucket: `presentations` (private)
- pages: `<package-id>/pages/<file-id>/<fileName>`
- assets: `<package-id>/assets/<file-id>/<fileName>`

### Read Flow
1. Load package row from `presentations_packages`.
2. Read file metadata from `data.pages` and `data.assets`.
3. Download files from Storage.
4. Build in-memory package for viewer/editor.

### Write Flow
1. Upload/replace files in Storage.
2. Update metadata in `presentations_packages.data`.
3. Remove stale files from Storage when files were removed in editor.

## Security Model
- RLS enabled for `presentations_packages`.
- Storage policies restricted to authenticated users for bucket `presentations`.
- App relies on Supabase authenticated role for read/write access.

## Deployment Model
1. Merge to `main`.
2. On VPS: `git pull && npm install && npm run build`.
3. Smoke-check key routes and shared-data behavior.

## Production Correctness Principle
Feature logic that should be shared across users must use Supabase/VPS-backed persistence.
`localStorage` is allowed only for per-browser transient UI state, not for shared business data.
