# INNIE Website

INNIE Group — official website for showcasing our products, services, projects, and company updates.

## Current design

The site follows the original INNIE notebook concept:

- A clean landing page with a thin INNIE header.
- One email collector on the landing page only.
- A Products & Services area that stays empty until INNIE publishes something.
- Clicking a published product or service opens its dedicated detail page.
- Product/service pages support a hero image, full description, live/coming-soon status, screenshots, and a launch link.
- Mobile and desktop layouts are supported.
- No generic or invented products are displayed.

## Content model

`content.js` contains the centralized publish-ready product/service model. Each published item can include:

- `slug`
- `name`
- `type` (`product` or `service`)
- `status` (`Live` or `Coming Soon`)
- `shortDescription`
- `description`
- `heroImage`
- `screenshots` (multiple images)
- `appUrl` for live products/services

The next publishing-system phase can replace this static content model with a database/admin dashboard so products can be published without editing code.

## Files

- `index.html` — INNIE landing page.
- `product.html` — individual product/service page.
- `styles.css` — visual system and responsive layout.
- `content.js` — published product/service data.
- `app.js` — landing-page rendering and email UI.
- `product.js` — product/service detail rendering.

## Email

The landing-page email form currently provides a UI confirmation only. Before production launch, connect this single collector to the chosen email backend.

## Deployment

The project is intentionally framework-free at this stage, so it can be deployed directly to Vercel as a static site. GitHub is the source of truth.

## Repository

https://github.com/innie1/innie-website
