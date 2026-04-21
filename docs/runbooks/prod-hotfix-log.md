# Production Hotfix Log

## Purpose
This log is mandatory for any manual changes made directly on production infrastructure (VPS), outside normal Git-tracked application code.

## Entry Format
- Date/time (timezone)
- Incident/symptom
- Root cause
- Exact change on production (files/commands)
- Validation result
- Rollback note

---

## 2026-04-21 (Europe/Moscow)

### 1) Storage upload failed (`Not Allowed`) for presentations
- Incident/symptom:
  - Creating presentation package failed with `Storage upload failed ... Not Allowed`.
- Root cause:
  - Public domain `alfanib.ru` reverse proxy had routes for `/rest/` and `/auth/`, but no `/storage/` proxy to Supabase gateway.
- Exact production change:
  - File: `/etc/nginx/sites-enabled/alpha`
  - Added block:
    - `location /storage/ { proxy_pass http://127.0.0.1:8000/storage/; ... }`
    - with forwarded auth headers:
      - `proxy_set_header apikey $http_apikey;`
      - `proxy_set_header Authorization $http_authorization;`
  - Reloaded nginx after syntax check:
    - `nginx -t`
    - `systemctl reload nginx`
- Validation:
  - Test upload to `https://alfanib.ru/storage/v1/object/...` returned HTTP `200`.
  - Presentation creation/upload started working in UI.
- Rollback note:
  - Restore backup of `/etc/nginx/sites-enabled/alpha` created before edit and reload nginx.

### 2) Frontend endpoint mismatch and browser fetch errors
- Incident/symptom:
  - After temporary URL switch, browser showed `TypeError: Failed to fetch`.
- Root cause:
  - HTTPS app attempted direct HTTP API URL in browser (mixed content/network restriction path).
- Exact production change:
  - File: `/var/www/alpha-dashboard/.env.local`
  - Set:
    - `VITE_SUPABASE_URL=https://alfanib.ru`
  - Rebuilt frontend:
    - `cd /var/www/alpha-dashboard && npm run build`
- Validation:
  - Built bundle contains `https://alfanib.ru` as Supabase base URL.
  - Storage endpoint reachable via domain proxy.
- Rollback note:
  - Restore previous `.env.local` backup and rebuild.

