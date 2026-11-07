# Promise to Palestine: Love Beyond Borders

A multilingual PERN-stack (PostgreSQL, Express, React, Node) fundraising platform.
Languages: English, Arabic, Urdu, French, Turkish, Spanish, with full right-to-left layout.

**The centrepiece:** a tatreez-style cross-stitch panel on the home page. Every completed promise adds one real stitch.

## Quick start

Requires Node 20+ and PostgreSQL 14+.

```bash
createdb promise_to_palestine
cp server/.env.example server/.env      # then edit it
npm run install:all
npm run db:migrate
npm run db:seed                         # add -- --demo for clearly labelled sample pledges (dev only)
npm run dev:server                      # API on :4000
npm run dev:client                      # site on :5173
```

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12+ characters) in `server/.env` before seeding to create your admin login, then open `/admin`.

## Taking real donations

1. Create a Stripe account, put `STRIPE_SECRET_KEY` in `server/.env`.
2. Add a webhook to `https://YOUR-DOMAIN/api/webhooks/stripe` for: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, `charge.refunded`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Set `DEMO_PAYMENTS=false` (it is ignored in production anyway).

Pledges only count toward the total once Stripe confirms payment via webhook.

## Deploying

`npm run build` then `NODE_ENV=production npm start`. Express serves the built React app, so it is one deployable. In production set `DATABASE_URL`, a long random `JWT_SECRET`, and `CLIENT_URL` (your public https address). Works on Render, Railway, Fly.io or any VPS with managed Postgres.

## Before you go live (important)

- **Legal and trust.** Collecting money for a cause usually requires a registered charity or non-profit, or a partnership with one that receives the funds. Check the rules in your country and add the organisation's name and registration number to the About page and footer. Donors rightly look for this.
- **Edit the content.** The impact descriptions and the allocation percentages (admin > Campaign) are placeholders. Make them match what your partner organisation actually delivers. Do not promise specific outcomes you cannot verify.
- **Have the translations reviewed** by native speakers. They were written carefully but should get a human check, especially Urdu and Arabic, before launch.
- **Privacy policy and receipts.** Add a privacy page and send email receipts (Stripe can send them from its dashboard settings).

## Adding a language

1. Copy `client/src/i18n/locales/en.json` and translate it.
2. Register it in `client/src/i18n/index.js` (`LANGUAGES`, and `RTL` if right-to-left).
3. Add the code to `SUPPORTED_LANGS` in `server/src/middleware.js`.

Updates (stories) hold a translation per language in the database and fall back to English.

## Security notes

Helmet headers and CSP, rate limits (global, donations, login, newsletter), zod validation on every input, parameterised SQL, bcrypt-hashed admin passwords, signed Stripe webhooks verified on the raw body, donor emails never returned by public endpoints, anonymous donors hidden at the query level, and money stored as integer cents.

## Tests

`npm test --prefix server` (needs the database running).
