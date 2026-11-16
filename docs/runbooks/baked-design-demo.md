# Baked Design preview

The public preview is a static catalog combining the Living Dashboard and the Red Cap demo fixtures. It includes the app navigation, quarter selection, sample editor, KPI tables, charts, calendar, form controls, statuses, and product cards. Quarter and edit interactions use native HTML controls and only demonstrate visual states. Its HTML renders without JavaScript, API access, or an authenticated browser. The same preview is served at the domain root and at `/living-dashboard` so website scanners can use either route.

## Deployment

- Use GitHub main as the release source. Install `ops/brand-preview/index.html` and `public/app-icon.png` under `/var/www/alpha-brand-preview`.
- Issue a certificate for `alpha-dashboard.152-234-236-200.sslip.io` using the existing Certbot Docker image and webroot. Mount `/etc/letsencrypt-alpha-ip:/etc/letsencrypt` and `/var/www/letsencrypt:/acme`. Run `certonly --webroot -w /acme -d alpha-dashboard.152-234-236-200.sslip.io`. The existing `alpha-ip-certbot.timer` renews both lineages.
- Install `ops/brand-preview/nginx.conf` as `/etc/nginx/sites-available/alpha-brand-preview`, link it in `sites-enabled`, run `nginx -t`, and reload Nginx.
- Verify public HTTPS at `/` and `/living-dashboard`, along with HTTP 404 for Supabase and unrelated application routes under the preview hostname.

To take the preview offline, remove the site link, validate the Nginx configuration, and reload Nginx. Remove the preview certificate lineage with Certbot when it no longer needs renewal.
