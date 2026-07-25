# OlivePinch

Meal subscription delivery app — Birmingham, UK pilot. Three pieces, one repo:

| Path | What it is | Dev URL |
|---|---|---|
| `/` (this root) | Customer web app — marketing site, subscribe funnel, post-login dashboard | http://localhost:5173 |
| `admin/` | Internal ops panel — menu, zones, customer support, orders, revenue | http://localhost:5174 |
| `server/` | Express + Prisma + Postgres API both frontends talk to | http://localhost:4000 |

## Running it locally

```bash
# 1. Backend first — see server/README.md for full setup
cd server && cp .env.example .env && npm install
npm run prisma:migrate && npm run prisma:seed && npm run dev

# 2. Customer app
cd .. && npm install && npm run dev

# 3. Admin panel
cd admin && npm install && npm run dev
```

Seeded admin login: `admin@olivepinch.co.uk` / `ChangeMe123!` (see `server/prisma/seed.ts`).

## Status

Both frontends are fully wired to the real API — no mock/localStorage state left in the customer app's subscribe funnel or dashboard. Everything's been verified end-to-end against a local Postgres database: the full signup funnel (postcode → plan → profile → goal → preferences → meals → menu → payment → OTP → password), the post-login dashboard (profile, health tracker, meal delivery with pause/resume, subscription renewal, GDPR export/delete), and the admin panel (menu/zones/customers/orders/revenue/admin management).

**Not done yet, on purpose:**
- **Not deployed together** — the customer app and admin panel are on Vercel, but the backend needs a real hosted Postgres to go with it (deliberately deferred — no Supabase migration yet). Until then, Vercel previews of the frontends have no live backend to call.
- **SMS, real Stripe/Resend keys** — need actual accounts/API keys only you can provide; the app runs in dev-mode (console-logged OTPs, auto-succeeding payments) without them.

See `server/README.md` and `admin/README.md` for the details on each piece.

## Design system

Outfit (headings) + Work Sans (body), warm cream/white background, olive-600 primary, coral-500 accent — see `src/index.css` for the full token set. The admin panel intentionally uses a *different* visual system (ported from a prior internal project, Alhaji Foods Agent) — green/gray, Material Symbols, Inter — by explicit request; that's a deliberate divergence, not an inconsistency.
