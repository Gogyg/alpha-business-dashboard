# Frontend Structure

## Routing (high level)
- `/` — main dashboard (Красная шапочка)
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
