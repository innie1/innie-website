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

### Visitor counts

The public pages (home, about, product) load Vercel Web Analytics from `/_vercel/insights/script.js`. It uses no cookies and stores no personal data. Turn it on once in Vercel → the `innie-website` project → **Analytics** → **Enable**; visits then appear on that tab. The admin dashboard is left out so your own visits there are not counted.

### Required Vercel environment variables

- `GITHUB_TOKEN` — fine-grained GitHub token with Contents read/write access to this repository.
- `GITHUB_REPO` — `innie1/innie-website` (optional; this is the default).
- `GITHUB_BRANCH` — `main11` (optional; this is the default).
- `ADMIN_PASSWORD` — strong private password for `/admin.html`.
- `ADMIN_SESSION_SECRET` — long random secret used to sign the admin session cookie.
- `SUPABASE_URL` — Supabase project URL used by the email collector (`https://skojozxjeoobakrubnuj.supabase.co`).
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key; server-side only, never expose it in frontend code.
- `RESEND_API_KEY` — Resend key for the new-subscriber alert and the welcome email.
- `NOTIFICATION_EMAIL` — where new-subscriber alerts go (optional; defaults to `innswara@gmail.com`).
- `RESEND_FROM_EMAIL` — sender address (optional; defaults to Resend's test sender, which can only mail your own Resend account — verify a domain in Resend to email subscribers).
- `VISITOR_SALT` — random secret used to fingerprint visitors for rating and login limits (optional; falls back to `ADMIN_SESSION_SECRET`).

Without `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY`, sign-ups on the live site cannot be stored and visitors see an error.

### Database

Run [`supabase.sql`](./supabase.sql) in the Supabase SQL Editor. It is safe to re-run and creates:

- `innie_subscribers` — homepage email sign-ups (unique email).
- `innie_product_ratings` — star ratings, one per visitor per product.
- `innie_admin_login_failures` — failed admin logins, for the lockout.

All three have row level security switched on with no policies, so only the server's service-role key can read or write them.

### Abuse protection

- **Sign-ups:** the welcome email and the admin alert go out only the first time an address is added, so the form cannot be used to send repeated mail to someone else's inbox. The welcome email is sent only when Supabase confirms the address is new.
- **Ratings:** only published products can be rated, and each visitor has one rating per product; rating again replaces the earlier one. Visitors are identified by a one-way hash of their IP address, never the raw IP.
- **Admin login:** 5 wrong passwords from one visitor within 15 minutes locks that visitor out for 15 minutes.
- **Editing:** saving an edit keeps the product's existing images; new uploads get unique file names so they never overwrite earlier ones. A new or renamed item cannot take the name of another published item.

## Files

- `index.html` — INNIE landing page.
- `about.html` — INNIE about page and contact information.
- `product.html` — individual product/service page.
- `styles.css` — public visual system, animations, and responsive layout.
- `assets/og-image.png` — 1200×630 link-preview image for X, LinkedIn, WhatsApp and Facebook. The pages reference it by full URL (`https://innie-website-three.vercel.app/assets/og-image.png`), so update those meta tags if the site moves to a custom domain.
- `content.js` — published product/service data; managed by the publishing API.
- `app.js` — landing-page rendering and the single email collector.
- `product.js` — product/service detail rendering.
- `admin.html` — private publishing dashboard UI and subscriber viewer.
- `admin.css` — publishing dashboard styles.
- `admin.js` — dashboard interaction, editing, uploads, and subscriber management.
- `api/admin-login.js` — protected admin login endpoint.
- `api/admin-logout.js` — clears the admin session cookie (it is HttpOnly, so only the server can).
- `api/admin-content.js` — authenticated published-content endpoint.
- `api/admin-publish.js` — GitHub-backed publishing/editing endpoint.
- `api/admin-unpublish.js` — authenticated unpublish endpoint.
- `api/admin-subscribers.js` — authenticated subscriber emails endpoint.
- `api/subscribe.js` — Supabase-backed email subscription endpoint with Resend automated alerts.
- `api/rate-product.js` — interactive 5-star ratings and customer reviews endpoint.
- `api/_lib/` — shared server helpers (admin session check, Supabase access, reading/writing `content.js`). Vercel does not expose files starting with `_` as endpoints.
- `supabase.sql` — database setup for subscribers, ratings and the admin login lockout.
- `dev-server.js` — lightweight local development server for static files and `/api/` endpoints.
- `vercel.json` — minimal Vercel configuration; API function runtimes are detected automatically by Vercel. It bundles `content.js` with the ratings endpoint so it can check which products are published.

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
