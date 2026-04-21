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

### Menu Configuration
Defines visible menu items and custom pages for all users.

## User Visibility Rules
- Shared business entities must be visible to different users/sessions.
- Browser-only storage is not allowed as source of truth for shared entities.
