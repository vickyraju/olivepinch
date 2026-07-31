# OlivePinch API

Node.js + TypeScript + Express + Prisma + PostgreSQL backend for the OlivePinch customer web app and admin panel, per the PRD's suggested stack (§4).

Deployed at https://olivepinch-backend.onrender.com (Render, `eu-west-2`, free plan). Talks to a Supabase Postgres database in the same region. Both are wired up for real — this isn't a stub.

## Stack

- **Runtime**: Node.js, TypeScript, Express 5
- **DB**: PostgreSQL via Prisma ORM (Supabase in production)
- **Auth**: JWT (30-day customer token / 12-hour admin token) + bcrypt password hashing + email OTP
- **Payments**: Stripe (Payment Intents) — falls back to a dev-mode auto-succeed path if `STRIPE_SECRET_KEY` is unset (still unset in production; real payments aren't live yet)
- **Email**: Resend API if `RESEND_API_KEY` is set, otherwise logs to console (still unset in production; OTPs/recovery emails aren't actually delivered yet)
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

`CORS_ORIGIN` accepts a comma-separated list — the customer app and admin panel's deployed origins (or `5173`/`5174` locally) both need to be listed.

## Deploying

`render.yaml` at the repo root defines the Render Blueprint. Build command runs `prisma migrate deploy` automatically, so pushing to `backend` both ships code and applies any new migrations. Required env vars (set in Render's dashboard, not committed): `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `APP_URL`, `CRON_SECRET`; optional: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`.

## API surface

| Area | Endpoints |
|---|---|
| Postcode | `POST /api/postcode/check` (real postcodes.io lookup + zone match), `POST /api/postcode/leads` |
| Menu | `GET /api/menu-items`, `POST /api/pricing/estimate` |
| Signup | `POST /api/customers/provisional` (blocks re-upserting over ACTIVE/READ_ONLY accounts), `PATCH /api/customers/:id/preferences` |
| Subscribe | `POST /api/subscriptions` (supports per-day menu customization via `dayMenus`), `POST /api/payments/intent`, `POST /api/payments/confirm`, `POST /api/payments/webhook` |
| Auth | `POST /api/auth/otp/send`, `POST /api/auth/otp/verify`, `POST /api/auth/password`, `POST /api/auth/login`, `GET /api/auth/complete-account` |
| Customer dashboard (Bearer auth) | `GET/PATCH /api/customers/me`, `GET /api/customers/me/export`, `DELETE /api/customers/me`, `GET/POST /api/health-logs`, `GET /api/subscriptions/current`, `POST /api/subscriptions/:id/pause`, `POST /api/subscriptions/:id/resume`, `POST /api/subscriptions/:id/renew` (goes through the same intent/confirm chain as initial checkout, not a separate auto-succeed path) |
| Admin (admin Bearer auth) | `POST /api/admin/auth/login`, `GET /api/admin/auth/me`, CRUD on `/api/admin/menu-items`, CRUD on `/api/admin/zones`, `GET /api/admin/customers[/:id]` (paginated), `GET /api/admin/customers/:id/audit-log`, `POST /api/admin/customers/:id/{pause-override,refund,reactivate}` (each logged to `AdminAuditLog`), `GET/POST /api/admin/admins`, `DELETE /api/admin/admins/:id`, `GET /api/admin/revenue`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status` |
| Internal | `POST /api/internal/recovery-sweep` — FR-C26 sweep for paid-but-abandoned signups, Bearer-gated by `CRON_SECRET` (fails closed — refuses to run if unset). Called daily by a GitHub Actions workflow (`.github/workflows/recovery-sweep.yml` on `main`) rather than a dedicated Render Cron Job, since it's a single lightweight HTTP call. |

Every write endpoint recomputes price/BMI/pause-eligibility server-side — the client never gets to assert its own totals or bypass the 4-pauses-per-month cap.

## What's genuinely still deferred

- **SMS notifications** (Twilio) — the frontend never collects a phone number, so only email is wired. Add a phone field + Twilio client if SMS becomes a requirement.
- **Real Stripe/Resend/Twilio credentials** — need actual accounts/API keys only the project owner can provide. Until then, payments auto-succeed and OTPs/emails log to console instead of sending for real.
- **Worldpay** — evaluated as the payment gateway of choice instead of Stripe, but their Access API requires sandbox credentials issued by a Worldpay Implementation Manager (not self-serve). On hold until those exist.

Everything else that used to be listed here as deferred (frontend wiring, admin audit trail, admin invite flow, customer pagination) has been built — see the API surface table above.
