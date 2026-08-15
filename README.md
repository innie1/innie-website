# INNIE Website

INNIE Group — official website for showcasing our products, services, projects, and company updates.

## Design direction

The site follows the original INNIE notebook concept rather than a generic SaaS template:

- Clean landing page with a thin INNIE header.
- **One email collector on the landing page only.**
- The collector is compact on desktop and stacks cleanly on mobile.
- Products & Services stays empty until INNIE publishes something.
- Published items become clickable cards and open their own detail page.
- Detail pages support a hero image/logo, full description, status, multiple screenshots, and a live launch link.
- No invented or placeholder products are shown to visitors.
- Responsive mobile and desktop layouts.

## Publishing dashboard

`/admin.html` is the private publishing dashboard. It is designed so INNIE can manage the site without editing website code:

1. Sign in with the admin password.
2. View everything currently published.
3. Add or edit a product/service name, type, status, launch URL, short description and full description.
4. Upload a hero/logo image.
5. Upload multiple product screenshots (up to 12, 3 MB each).
6. Publish/save changes or unpublish an item.

The dashboard sends content to protected Vercel serverless endpoints. Publishing commits the images and updated `content.js` to GitHub. Vercel can then automatically redeploy the updated site.

### Required Vercel environment variables

- `GITHUB_TOKEN` — fine-grained GitHub token with Contents read/write access to this repository.
- `GITHUB_REPO` — `innie1/innie-website` (optional; this is the default).
- `GITHUB_BRANCH` — `main11` (optional; this is the default).
- `ADMIN_PASSWORD` — strong private password for `/admin.html`.
- `ADMIN_SESSION_SECRET` — long random secret used to sign the admin session cookie.
- `SUPABASE_URL` — Supabase project URL used by the email collector.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key; server-side only, never expose it in frontend code.

### Email subscriber table

The single homepage email collector expects a Supabase table named `innie_subscribers` with a unique email address. The ready-to-run SQL is in [`supabase.sql`](./supabase.sql).

The service-role key is used only inside the Vercel serverless function, so subscriber emails are not committed to the public GitHub repository.

## Files

- `index.html` — INNIE landing page.
- `product.html` — individual product/service page.
- `styles.css` — public visual system and responsive layout.
- `content.js` — published product/service data; managed by the publishing API.
- `app.js` — landing-page rendering and the single email collector.
- `product.js` — product/service detail rendering.
- `admin.html` — private publishing dashboard UI.
- `admin.css` — publishing dashboard styles.
- `admin.js` — dashboard interaction, editing, and uploads.
- `api/admin-login.js` — protected admin login endpoint.
- `api/admin-content.js` — authenticated published-content endpoint.
- `api/admin-publish.js` — GitHub-backed publishing/editing endpoint.
- `api/admin-unpublish.js` — authenticated unpublish endpoint.
- `api/subscribe.js` — Supabase-backed email subscription endpoint.
- `supabase.sql` — database table setup for homepage subscribers.
- `vercel.json` — minimal Vercel configuration; API function runtimes are detected automatically by Vercel.

## Deployment

The project is framework-free and can be deployed directly to Vercel. GitHub is the source of truth. The Vercel configuration is intentionally minimal so Vercel can automatically detect the Node.js serverless functions in `api/` without an invalid legacy runtime declaration.

Before production use, configure the Vercel environment variables above and run `supabase.sql` in the Supabase SQL Editor.

Every meaningful project change should keep this README current.

## Repository

https://github.com/innie1/innie-website
