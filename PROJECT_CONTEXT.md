# PROJECT_CONTEXT

## 1) Project and Infrastructure
- Project: `alpha-business-dashboard` (`React + Vite + TypeScript`)
- Local path: `/Users/dmitriimusikhin/Documents/Vibe coding/alpha-business-dashboard-main`
- Production: VPS
- Production path: `/var/www/alpha-dashboard`
- Deploy process:
  1. Merge to `main` on GitHub
  2. On VPS: `git pull && npm install && npm run build`
- VPS access: `ssh root@2.26.106.1`
- Vercel: backup channel, not primary production
- DB: Supabase on VPS, shared data for all users

## 2) Team Rules (Critical)
- Any production changes only by explicit user request.
- Work via GitHub flow (`main` + deploy on VPS after merge).
- For new features/changes, clarify requirements first.
- Before developing any new solution or changing an existing one, always ask clarifying questions to the user.
- When implementing new solutions/features, always reuse existing buttons, logic, design patterns, and current UX behavior if they already exist.
- If no suitable existing solution exists, apply the `UI UX pro max` skill as the design/UX fallback.
- If changing an existing solution, also apply the `UI UX pro max` skill.
- Before production deploy, update/add technical docs in `docs/` (architecture/domain/data/frontend/runbooks/ADR) for all meaningful logic or architecture changes.
- Any manual production hotfix on VPS (nginx/env/policies/system config) must be documented the same day in `docs/runbooks/prod-hotfix-log.md` with date, reason, exact changed files/commands, and rollback note.
- Before any next deploy, verify that all manual VPS changes are either:
  - reflected in repo docs/runbooks, and
  - reproducible by documented steps (so they are not lost on server rebuild/migration).
- Keep UI/UX quality high (reference style: “Красная шапочка”).

## 3) Design/UX Baseline
- “Красная шапочка” visual language is the standard.
- Prefer 1:1 behavior parity with user pages where possible:
  - add/edit/view logic
  - drag/drop patterns
  - widget behavior consistency

## 4) Main Focus Files
- `src/app/pages/EventsDashboard.tsx`
- `src/app/pages/Dashboard.tsx`
- `src/app/pages/KshCdpoDashboard.tsx`
- `src/app/pages/WorkspacePage.tsx`
- `src/app/components/RedcapStandardWidgets.tsx`
- `src/app/components/Layout.tsx`
- `src/app/utils/api.ts`
- `utils/supabase/info.tsx`
- `schema.sql`
- `supabase/migrations/20260415_events_singleton.sql`

## 5) Events Dashboard — Current Implemented Behavior

### 5.1 Calendar + list model
- Two visible months in calendar (current + next for current view).
- Event list shows only events for visible two months.
- Past events automatically move to the bottom of visible list.
- Past events auto-status: `Пройдено`.
- Past block has section header `Прошедшие события`.
- Past cards are visually muted.

### 5.2 Date cell behavior
- Current day has red highlight.
- Weekends/holidays are red-tinted in calendar.
- RF production calendar 2026 non-working dates are hardcoded (incl. transfers).
- Day with events:
  - up to 3 mini color indicators at the bottom,
  - `+N` badge in top-right if more than 3 events.
- Hover tooltip shows event title for event days.

### 5.3 Event card/model fields
- Event fields: title, date, status, color, optional description.
- Metadata row in modal is removed (as agreed).
- Date picker is popup calendar in create/edit modal.
- Create/edit forms are unified in style and structure.

### 5.4 Events UI interactions
- Event operations are not tied to page edit mode.
- Opening event details works in view mode.
- Add-from-date uses confirmation dialog in dashboard style.
- Add button is green branded.

### 5.5 Multi-calendar split
- There are 3 independent event spaces (switch buttons above widget):
  - `Дирекция`
  - `ПрП`
  - `Прочее`
- Active calendar button is red.
- Each calendar has independent events (`calendarKey` in event model).
- Add event writes to active calendar.
- Switching calendar updates both date markers and right-side event list.

## 6) Shared Sync and Concurrency (DB)

### 6.1 Frontend/API logic
- `events` sync is shared for all users.
- Conflict-safe save for events:
  - merge local changes vs latest snapshot,
  - optimistic lock via `updated_at`,
  - retry on conflict.
- Realtime sync:
  - Supabase channel subscription on `public.events`,
  - updates auto-refresh open sessions.
- Event IDs migrated to string UUID-style behavior for safe concurrent inserts.

### 6.2 DB schema approach
- `events` table now uses singleton semantics:
  - `singleton_key = 'global'`
  - unique index on `singleton_key`
- Migration file:
  - `supabase/migrations/20260415_events_singleton.sql`
  - consolidates existing rows to one canonical row
  - preserves merged events and enforces singleton index

## 7) Layout/Header Agreements
- On `/dashboard`:
  - hide quarter switch in top header
  - hide edit button in top header
- Header geometry made stable to avoid visual jumping between menu sections.

## 8) Production Status (latest known in this context)
- Code deployed from commit: `2ee6d5f` (main).
- VPS build passed.
- Events singleton migration applied in prod DB.
- REST checks confirmed:
  - one `events` row
  - `singleton_key = global`
  - data readable

## 9) Pre-release Checklist (before any next prod rollout)
- Local: `npm run build`
- Update technical docs before rollout:
  - `docs/architecture.md`
  - `docs/domain-model.md`
  - `docs/data-layer.md`
  - `docs/frontend-structure.md`
  - `docs/runbooks/*`
  - `docs/adr/*` (when decision-level changes exist)
- Verify critical data logic is not local-only before rollout:
  - ensure new/changed features persist via Supabase/VPS backend,
  - ensure behavior is shared across different users/sessions (not tied to one browser `localStorage` only).
- Smoke-check critical screens:
  - Красная шапочка
  - Events dashboard
  - КШ CDPO
  - User pages
  - view/edit modes

## 10) How to use this context in a new chat
Use this exact first message:

`Прочитай /Users/dmitriimusikhin/Documents/Vibe coding/alpha-business-dashboard-main/PROJECT_CONTEXT.md и работаем строго по нему.`
