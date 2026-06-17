# Domain Model

## Purpose
Define core business entities and their behavior rules.

## Entities

### Presentation Package
Represents one presentation unit shown in `/presentations`.

Fields:
- `id` (UUID)
- `title`
- `eventDate` (nullable date)
- `isRecurring` (boolean)
- `pages[]` (HTML files)
- `assets[]` (CSS/JS/images/fonts/etc.)

Behavior rules:
- Package can contain multiple HTML pages.
- Pages can link to each other within one package.
- Package can be edited (add/replace/remove pages).
- Package can be fully removed.

List grouping rules:
- Active: `eventDate >= today` OR `isRecurring = true`.
- Archive: `eventDate < today` AND `isRecurring = false`.

### Events
Shared events model used by dashboard widgets.

Key rules:
- Shared for all users.
- Singleton data semantics in DB.
- Conflict-safe save and realtime sync.
- Living dashboard reads the nearest future event from this same shared source.
- Event status on living dashboard is normalized against the event date:
  - past events are treated as `passed`
  - same-day future lookup shows `сегодня`

### Menu Configuration
Defines visible menu items and custom pages for all users.

### Living Dashboard View Model
Represents the shared executive page available at `/living-dashboard`.

Fields / derived blocks:
- `redcapMetrics[]` — weighted summary of Красная шапочка sections
- `kpiMetrics[]` — score-card metrics derived from digital metrics
- `focusConfig`
- `nearestFutureEvent`

Business rules:
- page is quarter-aware for data loading, but trend comparison is weekly inside the same quarter
- Red Cap center caption is shown as `Текущий результат`
- KPI center caption is shown as `Прогноз` for the current/future quarter and `Показатель` for past-quarter review
- KPI `MAU Spotlight` uses Red Cap `runrate` with a hard cap of `120%`
- KPI `Продажи ММБ` uses Red Cap `runrate` with a hard cap of `150%`
- VOC score is normalized as:
  - `< 4.75` => `80%`
  - `4.75..4.78` inclusive => `100%`
  - `> 4.78` => `110%`
- personnel/people summary value is sourced from `eNPS`
- `focusConfig` is a shared persisted block inside the quarter dashboard payload and must remain visible across users/sessions

### MBO Page
Represents a shared executive MBO screen available at `/mbo`.

Fields:
- `headerTitle`
- `headerSubtitle`
- `liveLabel`
- `sections[]`

Section fields:
- `id`
- `title`
- `badge`
- `paletteId`
- `metrics[]`
- `insights[]`

Behavior rules:
- shared singleton entity for all authenticated users
- not quarter-bound
- full edit mode supports add/remove/reorder sections
- every section stores its own color palette selection
- metrics and insight cards are fully editable and saved in DB

## User Visibility Rules
- Shared business entities must be visible to different users/sessions.
- Browser-only storage is not allowed as source of truth for shared entities.
