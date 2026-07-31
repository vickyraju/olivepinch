# OlivePinch — Customer App branch

This branch holds only the customer-facing web app (`src/`) for the OlivePinch meal subscription pilot — marketing site, subscribe funnel, and post-login dashboard.

Deployed at https://olivepinch.vercel.app, talking to the API on the [`backend`](../../tree/backend) branch (https://olivepinch-backend.onrender.com).

## Running it locally

```bash
npm install
npm run dev   # http://localhost:5173
```

Set `VITE_API_URL` (defaults to `http://localhost:4000/api`) if you're running the backend somewhere other than `localhost:4000` — see the `backend` branch's README for running the API locally.

## Status

Fully wired to the real API — no mock/localStorage state left in the subscribe funnel or dashboard. Verified end-to-end in production: the full signup funnel (postcode → plan → profile → goal → preferences → meals → menu → payment → OTP → password), the post-login dashboard (profile, health tracker, meal delivery with pause/resume, subscription renewal, GDPR export/delete).

**Not done yet, on purpose:**
- **Real Stripe/Resend/Twilio credentials** — need actual accounts/API keys only the project owner can provide; the app runs in dev-mode (console-logged OTPs, auto-succeeding payments) without them.
- **Worldpay** — evaluated as the payment gateway of choice instead of Stripe, on hold until sandbox credentials exist (Worldpay's Access API isn't self-serve).

## Design system

Instrument Serif (headings) + Work Sans (body), warm cream background, olive-600 primary — see `src/index.css` for the full token set. Matches the client-approved reference design. The admin panel (separate branch) intentionally uses a *different* visual system by explicit request — that's a deliberate divergence, not an inconsistency.

Other branches in this repo:

| Branch | What it is |
|---|---|
| [`backend`](../../tree/backend) | Express + Prisma + PostgreSQL API |
| [`admin-panel`](../../tree/admin-panel) | Internal ops panel |
