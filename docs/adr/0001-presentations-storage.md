# ADR 0001: Store Presentation Packages in Supabase (Postgres + Storage)

- Status: Accepted
- Date: 2026-04-21

## Context
Initial implementation of presentation packages stored all data in browser `localStorage`.
That made uploaded presentations visible only for the browser/user that created them.
This violated the requirement that data must be shared between users in production.

## Decision
Use Supabase as the source of truth:
- Store package metadata in `public.presentations_packages`.
- Store HTML pages and related assets in private Storage bucket `presentations`.
- Keep only file references in Postgres `data` JSONB.

## Consequences
### Positive
- Shared visibility for all authenticated users.
- Data survives browser/device change.
- Cleaner separation: metadata in DB, binary/text files in Storage.

### Tradeoffs
- More API complexity (upload/download orchestration).
- Need to maintain Storage policies and cleanup of stale files.

## Alternatives Considered
1. Keep `localStorage` only.
   - Rejected: not shared, not production-safe for collaborative data.
2. Store full HTML/assets in JSONB in Postgres.
   - Rejected: poor fit for large file payloads and asset management.

## Implementation Notes
- Table: `presentations_packages`.
- Bucket: `presentations`.
- RLS and Storage policies require authenticated role.
- Viewer/editor reads metadata first, then fetches files from Storage.
