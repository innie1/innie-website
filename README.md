# INNIE Website

INNIE Group — official website for showcasing our products, services, projects, and company updates.

## Design direction

The site follows the INNIE design direction:

- Clean landing page with a thin INNIE header and brand emblem.
- **One email collector on the landing page only.**
- The collector is compact on desktop and stacks cleanly on mobile with real-time feedback.
- Products & Services section displays dynamic published items (empty state when nothing is published yet).
- Published items become clickable cards and open their own detail page.
- Detail pages support a hero image/logo, full description, status, multiple screenshots, and a live launch link.
- About INNIE page (`/about.html`) with company vision, social channels, and direct contact.
- Responsive mobile and desktop layouts with subtle micro-animations.

## Publishing dashboard

`/admin.html` is the private publishing dashboard. It is designed so INNIE can manage the site without editing website code:

1. Sign in with the admin password.
2. View everything currently published.
3. Add or edit a product/service name, type, status, launch URL, short description and full description.
4. Upload a hero/logo image.
5. Upload multiple product screenshots (up to 12, 3 MB each).
6. Publish/save changes or unpublish an item.
7. View collected email subscribers.

The dashboard sends content to protected Vercel serverless endpoints. Publishing commits the images and updated `content.js` to GitHub. Vercel can then automatically redeploy the updated site.

### Required Vercel environment variables

- `GITHUB_TOKEN` — fine-grained GitHub token with Contents read/write access to this repository.
- `GITHUB_REPO` — `innie1/innie-website` (optional; this is the default).
- `GITHUB_BRANCH` — `main11` (optional; this is the default).
- `ADMIN_PASSWORD` — strong private password for `/admin.html`.
- `ADMIN_SESSION_SECRET` — long random secret used to sign the admin session cookie.
- `SUPABASE_URL` — Supabase project URL used by the email collector (`https://skojozxjeoobakrubnuj.supabase.co`).
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key; server-side only, never expose it in frontend code.

### Email subscriber table

The single homepage email collector expects a Supabase table named `innie_subscribers` with a unique email address. The ready-to-run SQL is in [`supabase.sql`](./supabase.sql).

The service-role key is used only inside the Vercel serverless function, so subscriber emails are not committed to the public GitHub repository.

## Files

- `index.html` — INNIE landing page.
- `about.html` — INNIE about page and contact information.
- `product.html` — individual product/service page.
- `styles.css` — public visual system, animations, and responsive layout.
- `content.js` — published product/service data; managed by the publishing API.
- `app.js` — landing-page rendering and the single email collector.
- `product.js` — product/service detail rendering.
- `admin.html` — private publishing dashboard UI and subscriber viewer.
- `admin.css` — publishing dashboard styles.
- `admin.js` — dashboard interaction, editing, uploads, and subscriber management.
- `api/admin-login.js` — protected admin login endpoint.
- `api/admin-content.js` — authenticated published-content endpoint.
- `api/admin-publish.js` — GitHub-backed publishing/editing endpoint.
- `api/admin-unpublish.js` — authenticated unpublish endpoint.
- `api/admin-subscribers.js` — authenticated subscriber emails endpoint.
- `api/subscribe.js` — Supabase-backed email subscription endpoint with Resend automated alerts.
- `api/rate-product.js` — interactive 5-star ratings and customer reviews endpoint.
- `supabase.sql` — database table setup for homepage subscribers and product ratings.
- `dev-server.js` — lightweight local development server for static files and `/api/` endpoints.
- `vercel.json` — minimal Vercel configuration; API function runtimes are detected automatically by Vercel.

## Local Development

Run the local development server:

```bash
npm run dev
# or
node dev-server.js
```

The site will be available at:
- Homepage: `http://localhost:3000`
- Admin Dashboard: `http://localhost:3000/admin.html`
- Product Detail: `http://localhost:3000/product.html`
- About: `http://localhost:3000/about.html`

Environment variables for local testing (optional) can be placed in `.env` or `.env.local`.

## Deployment

The project is framework-free and can be deployed directly to Vercel. GitHub is the source of truth. The Vercel configuration is intentionally minimal so Vercel can automatically detect the Node.js serverless functions in `api/` without an invalid legacy runtime declaration.

Before production use, configure the Vercel environment variables above and run `supabase.sql` in the Supabase SQL Editor.

Every meaningful project change should keep this README current.

## Repository

https://github.com/innie1/innie-website
