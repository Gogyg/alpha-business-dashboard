# Frontend Structure

## Routing (high level)
- `/` — main dashboard (Красная шапочка)
- `/mbo` — shared MBO executive page
- `/dashboard` — events dashboard
- `/metrics` — important metrics
- `/goals` — quarter goals
- `/ksh-cdpo` — KSH CDPO list
- `/ksh-cdpo/:dashboardId` — KSH CDPO detail
- `/presentations` — presentations list
- `/presentations/:presentationId` — package viewer/editor

## Key UI Areas

### Layout
File: `src/app/components/Layout.tsx`
Responsibilities:
- Side menu rendering
- header controls
- auth/logout and menu settings
- route-specific header behavior (for example, quarter switch hidden on `/mbo`)

### Living Dashboard
File: `src/app/pages/LivingDashboard.tsx`

Responsibilities:
- render the executive living dashboard at `/living-dashboard`
- show two radar score widgets sourced from Красная шапочка data:
  - `Красная шапочка`
  - `KPI`
- calculate weekly trend deltas from the current quarter `trendHistory` snapshots instead of comparing with previous quarters
- show the nearest upcoming event using the shared `events` source that also powers Calendar
- render the shared `Фокус внимания` widget with editable items and shared persistence

UI behavior notes:
- radar labels use adaptive multiline layout for narrow widths to avoid clipping/overlap
- the Red Cap radar center caption is `Текущий результат`
- the KPI radar center caption is `Прогноз` for the current/future quarter and `Показатель` for a past quarter view
- `MAU Spotlight` in KPI radar uses Red Cap `runrate`, capped at `120%`
- `Продажи ММБ` in KPI radar uses Red Cap `runrate`, capped at `150%`
- focus bullets use the gold accent style agreed for the living dashboard
- focus widget edits are persisted into the shared quarter dashboard payload, not browser-only state
- nearest-event countdown is shown in working days and switches to `сегодня` for same-day events

### MBO
File: `src/app/pages/MboPage.tsx`

Responsibilities:
- render the shared executive MBO page
- support full edit mode for page header, sections, metrics, and insight cards
- allow per-section color theme selection
- persist shared state through Supabase singleton storage

### Presentations
Files:
- `src/app/pages/PresentationsPage.tsx`
- `src/app/pages/PresentationPackagePage.tsx`

Responsibilities:
- package list/create/edit metadata
- archive grouping logic
- package viewer, in-package HTML navigation
- package file management (add/replace/remove)

## API Layer
File: `src/app/utils/api.ts`
Responsibilities:
- typed client API wrappers
- Supabase table and storage orchestration
- shared persistence logic

## UI Consistency Rules
- Reuse existing component patterns first.
- Keep visual language aligned with existing project style.
- For new UX patterns without existing equivalents, apply `UI UX pro max` guidelines.

## UI Testing Checklist
- Test every meaningful UI change in a real browser before considering the task done.
- Minimum coverage:
  - desktop viewport around `1280x720`
  - mobile viewport around `390-520px`
  - view mode
  - edit mode for editable pages
- When a source mockup or HTML reference exists, compare the live page directly against that source.
- Check specifically for:
  - overlapping text
  - clipped text or controls
  - broken page width or inconsistent side paddings versus sibling sections
  - buttons colliding with nearby inputs/selects
  - labels collapsing into unreadable vertical stacks
  - unreadable contrast in dark surfaces
  - edit forms that visually overpower the content they edit
- If edit mode cannot be opened locally, the task must be marked as only partially UI-verified.
