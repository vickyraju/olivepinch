# OlivePinch API

Node.js + TypeScript + Express + Prisma + PostgreSQL backend for the OlivePinch customer web app and admin panel, per the PRD's suggested stack (§4).

Deployed at https://olivepinch-backend.onrender.com (Render, `eu-west-2`, free plan). Talks to a Supabase Postgres database in the same region. Both are wired up for real — this isn't a stub.

## Stack

- **Runtime**: Node.js, TypeScript, Express 5
- **DB**: PostgreSQL via Prisma ORM (Supabase in production)
- **Auth**: customer auth is Supabase Auth (email OTP + Google/Apple) — the frontend talks to Supabase directly; this backend verifies the resulting Supabase JWT (`supabase.auth.getUser()`, server-side) rather than issuing its own. Admin auth is unchanged: a separate 12-hour JWT + bcrypt password, seeded/invited accounts only.
- **Payments**: Worldpay (Access, Hosted Payment Pages) — falls back to a dev-mode auto-succeed path if `WORLDPAY_USERNAME`/`WORLDPAY_PASSWORD`/`WORLDPAY_ENTITY` are unset (still unset in production; real payments aren't live yet)
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

`SUPABASE_URL`/`SUPABASE_ANON_KEY` are **required** — unlike payments/email, there's no dev-mode fallback for identity, so every customer-authenticated route 501s without them. Use the same Supabase project as `DATABASE_URL`.

Worldpay and email are **optional** for local dev — leave the keys blank and payments auto-succeed via `/payments/confirm` without a real card.

`CORS_ORIGIN` accepts a comma-separated list — the customer app and admin panel's deployed origins (or `5173`/`5174` locally) both need to be listed.

## Deploying

`render.yaml` at the repo root defines the Render Blueprint. Build command runs `prisma migrate deploy` automatically, so pushing to `backend` both ships code and applies any new migrations. Required env vars (set in Render's dashboard, not committed): `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APP_URL`, `CRON_SECRET`; optional: `WORLDPAY_USERNAME`, `WORLDPAY_PASSWORD`, `WORLDPAY_ENTITY`, `WORLDPAY_API_URL`, `RESEND_API_KEY`, `EMAIL_FROM`.

## API surface

| Area | Endpoints |
|---|---|
| Postcode | `POST /api/postcode/check` (real postcodes.io lookup + zone match), `POST /api/postcode/leads` |
| Menu | `GET /api/menu-items`, `POST /api/pricing/estimate` |
| Signup | `POST /api/customers/provisional` (blocks re-upserting over ACTIVE/READ_ONLY accounts), `PATCH /api/customers/:id/preferences` |
| Subscribe | `POST /api/subscriptions` (supports per-day menu customization via `dayMenus`), `POST /api/payments/intent`, `POST /api/payments/confirm`, `POST /api/payments/webhook` |
| Auth | `POST /api/customers/link-account` — called right after a Supabase sign-in (OTP or Google/Apple) succeeds; finds the Customer by verified email and attaches the Supabase user id (handles both finishing signup and returning login, same call either way) |
| Customer dashboard (Supabase-JWT Bearer auth) | `GET/PATCH /api/customers/me`, `GET /api/customers/me/export`, `DELETE /api/customers/me`, `GET/POST /api/health-logs`, `GET /api/subscriptions/current`, `POST /api/subscriptions/:id/pause`, `POST /api/subscriptions/:id/resume`, `POST /api/subscriptions/:id/renew` (goes through the same intent/confirm chain as initial checkout, not a separate auto-succeed path) |
| Admin (admin Bearer auth) | `POST /api/admin/auth/login`, `GET /api/admin/auth/me`, CRUD on `/api/admin/menu-items`, CRUD on `/api/admin/zones`, `GET /api/admin/customers[/:id]` (paginated), `GET /api/admin/customers/:id/audit-log`, `POST /api/admin/customers/:id/{pause-override,refund,reactivate}` (each logged to `AdminAuditLog`), `GET/POST /api/admin/admins`, `DELETE /api/admin/admins/:id`, `GET /api/admin/revenue`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status` |
| Internal | `POST /api/internal/recovery-sweep` — FR-C26 sweep for paid-but-abandoned signups, Bearer-gated by `CRON_SECRET` (fails closed — refuses to run if unset). Called daily by a GitHub Actions workflow (`.github/workflows/recovery-sweep.yml` on `main`) rather than a dedicated Render Cron Job, since it's a single lightweight HTTP call. |

Every write endpoint recomputes price/BMI/pause-eligibility server-side — the client never gets to assert its own totals or bypass the 4-pauses-per-month cap.

## What's genuinely still deferred

- **SMS notifications** (Twilio) — the frontend never collects a phone number, so only email is wired. Add a phone field + Twilio client if SMS becomes a requirement.
- **Supabase Auth email delivery** — Supabase's built-in mailer is capped at 2 messages/hour and can only send to addresses on the Supabase org's own team, so real customer OTP emails need custom SMTP configured in the Supabase dashboard (Authentication → Emails → SMTP Settings) — the same kind of credential gate as Resend/Worldpay, just configured on Supabase's side instead of ours. Google/Apple sign-in also needs real OAuth credentials added there (Authentication → Providers) — Supabase doesn't provide shared ones for testing.
- **Real Worldpay/Resend/Twilio credentials** — code is fully wired (payments auto-succeed today in dev-mode); needs sandbox credentials from a Worldpay Implementation Manager to go live, which isn't self-serve. One spot flagged with a `TODO` in `lib/worldpay.ts` — the exact status-query response field/values — needs confirming against live docs once those credentials exist, since it can't be verified without a real sandbox payment.
- **Worldpay webhook** — `/api/payments/webhook` is a stub (`501`); real webhook configuration also goes through the Implementation Manager. `/payments/confirm`'s server-side status query is the primary confirmation path and doesn't depend on this.

Everything else that used to be listed here as deferred (frontend wiring, admin audit trail, admin invite flow, customer pagination) has been built — see the API surface table above.
