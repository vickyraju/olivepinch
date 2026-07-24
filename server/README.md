# OlivePinch API

Node.js + TypeScript + Express + Prisma + PostgreSQL backend for the OlivePinch customer web app and admin panel, per the PRD's suggested stack (§4).

## Stack

- **Runtime**: Node.js, TypeScript, Express 5
- **DB**: PostgreSQL via Prisma ORM
- **Auth**: JWT (30-day customer token / 12-hour admin token) + bcrypt password hashing + email OTP
- **Payments**: Stripe (Payment Intents) — falls back to a dev-mode auto-succeed path if `STRIPE_SECRET_KEY` is unset
- **Email**: Resend API if `RESEND_API_KEY` is set, otherwise logs to console (dev mode)
- **Validation**: Zod on every request body

## Setup

```bash
cp .env.example .env   # fill in DATABASE_URL at minimum
npm install
npm run prisma:migrate   # creates schema in your Postgres DB
npm run prisma:seed      # loads the 14 menu items, Birmingham zone, and admin user
npm run dev               # http://localhost:4000
```

Requires a running PostgreSQL instance. Locally, either:
- `brew install postgresql@14 && brew services start postgresql@14`, then `createdb olivepinch`, or
- any hosted Postgres (Neon, Supabase, Vercel Postgres) — paste its connection string into `DATABASE_URL`.

Stripe and email are **optional** for local dev — leave the keys blank and:
- payments auto-succeed via `/payments/confirm` without a real card
- OTP codes are printed to the server console instead of emailed

`CORS_ORIGIN` accepts a comma-separated list — the customer app (`5173`) and admin panel (`5174`) both need to be listed.

## API surface

| Area | Endpoints |
|---|---|
| Postcode | `POST /api/postcode/check`, `POST /api/postcode/leads` |
| Menu | `GET /api/menu-items`, `POST /api/pricing/estimate` |
| Signup | `POST /api/customers/provisional`, `PATCH /api/customers/:id/preferences` |
| Subscribe | `POST /api/subscriptions`, `POST /api/payments/intent`, `POST /api/payments/confirm`, `POST /api/payments/webhook` |
| Auth | `POST /api/auth/otp/send`, `POST /api/auth/otp/verify`, `POST /api/auth/password`, `POST /api/auth/login`, `GET /api/auth/complete-account` |
| Customer dashboard (Bearer auth) | `GET/PATCH /api/customers/me`, `GET /api/customers/me/export`, `DELETE /api/customers/me`, `GET/POST /api/health-logs`, `GET /api/subscriptions/current`, `POST /api/subscriptions/:id/pause`, `POST /api/subscriptions/:id/resume`, `POST /api/subscriptions/:id/renew` |
| Admin (admin Bearer auth) | `POST /api/admin/auth/login`, `GET /api/admin/auth/me`, CRUD on `/api/admin/menu-items`, CRUD on `/api/admin/zones`, `GET /api/admin/customers[/:id]`, `POST /api/admin/customers/:id/{pause-override,refund,reactivate}`, `GET /api/admin/revenue`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status` |

Every write endpoint recomputes price/BMI/pause-eligibility server-side — the client never gets to assert its own totals or bypass the 4-pauses-per-month cap. Postcode validity is checked against the seeded `Zone.postcodePrefixes`, not a hardcoded regex, so it reflects whatever the admin panel's Zones page currently has active.

## What's deferred (ponytail: shipped the lazy version, flagged the ceiling)

- **SMS notifications** (Twilio) — the frontend never collects a phone number, so only email is wired. Add a phone field + Twilio client if SMS becomes a requirement.
- **FR-C26 recovery sweep** — the "complete your account" link/token works when hit directly, but nothing yet schedules sending it to customers who paid and abandoned signup. Needs a cron job (e.g. Vercel Cron) periodically sweeping `PROVISIONAL` customers with a successful `Payment`.
- **Admin audit trail** — pause-override/refund/reactivate aren't logged against the admin who performed them. Add an `AdminAuditLog` table before this handles real support cases.
- Frontend (customer app + admin panel) still runs entirely on mock `localStorage`/`sessionStorage`/in-memory state — **not yet wired to this API**. That's a separate pass: replace `subscribe-context.tsx` / `dashboard-context.tsx` on the customer app, and the admin panel is already wired for real (built directly against these endpoints).

## Verification

**Customer funnel**: postcode check → provisional signup → preferences → subscription creation → dev-mode payment → OTP → password → login → authenticated profile/subscription fetch → health log → pause/resume (including the 4x/month cap rejecting a 5th pause) → renewal → GDPR export → GDPR delete → confirmed the deleted account can no longer log in.

**Admin panel**: admin login → menu item create/update/delete → zone list → customer search/detail → pause-override (bypassing the cap) → refund → reactivate → order board showing the paused day → manual status update → revenue report.

Both run against a real local Postgres database, via curl smoke-test scripts and a headless-browser pass over the admin UI. All passed.
