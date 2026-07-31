# OlivePinch — Customer App branch

This branch holds only the customer-facing web app (`src/`) for the OlivePinch meal subscription pilot — marketing site, subscribe funnel, and post-login dashboard.

Deployed at https://olivepinch.vercel.app, talking to the API on the [`backend`](../../tree/backend) branch (https://olivepinch-backend.onrender.com).

## Running it locally

```bash
npm install
npm run dev   # http://localhost:5173
```

Requires `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (customer auth — see below); `VITE_API_URL` is optional, defaults to `http://localhost:4000/api` — see the `backend` branch's README for running the API locally.

## Auth

Customer sign-in is Supabase Auth: email OTP (no password, same code for signup and returning login) plus Google/Apple. This app talks to Supabase directly (`src/lib/supabase.ts`) rather than through the backend — the backend only verifies the resulting session and links it to a Customer profile (`POST /customers/link-account`, called automatically on sign-in).

## Status

Fully wired to the real API — no mock/localStorage state left in the subscribe funnel or dashboard. Verified end-to-end in production: the full signup funnel (postcode → plan → profile → goal → preferences → meals → menu → payment → email OTP), the post-login dashboard (profile, health tracker, meal delivery with pause/resume, subscription renewal, GDPR export/delete).

**Not done yet, on purpose:**
- **Real Worldpay/Resend/Twilio credentials** — need actual accounts/API keys only the project owner can provide; the app runs in dev-mode (console-logged OTPs, auto-succeeding payments) without them.
- **Google/Apple sign-in credentials + custom SMTP** — configured on the Supabase side (Authentication → Providers / Emails), not this app's env vars. Buttons and the OTP flow are fully wired, just waiting on real credentials there.

## Design system

Instrument Serif (headings) + Work Sans (body), warm cream background, olive-600 primary — see `src/index.css` for the full token set. Matches the client-approved reference design. The admin panel (separate branch) intentionally uses a *different* visual system by explicit request — that's a deliberate divergence, not an inconsistency.

Other branches in this repo:

| Branch | What it is |
|---|---|
| [`backend`](../../tree/backend) | Express + Prisma + PostgreSQL API |
| [`admin-panel`](../../tree/admin-panel) | Internal ops panel |
