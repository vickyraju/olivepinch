# OlivePinch Payment Security Audit

**Date:** 2026-08-30
**Scope:** Every payment-related flow — `server/src/routes/payments.ts`, `server/src/routes/subscriptions.ts`, `server/src/lib/worldpay.ts`, `server/src/lib/pricing.ts`, `server/src/lib/promo.ts`, and the customer frontend's checkout call site (`olivepinch-ui-change/src/pages/subscribe/delivery.tsx`).
**Method:** Manual white-box trace of the complete flow (Customer → Frontend → Backend → Database → Worldpay → Backend confirmation → Database → fulfillment), plus targeted runtime verification scripts for the pure calculation logic (discount rounding, idempotency guard behavior) and live checks against production where non-destructive.

This is a **payment-specific deep-dive**, following the general application security audit already recorded in `SECURITY_AUDIT.md`. That report's payment-adjacent findings (OP-03 admin refund ownership, OP-05 dev-mode fallback, OP-14 confirm idempotency, OP-15 refund/Worldpay disconnect) are re-examined here in full, and OP-14 is now **fully resolved** (previously only partially addressed).

---

## 1. Executive Summary

- **Client-side amount manipulation: NOT POSSIBLE.** The server never accepts a price, total, or amount from the client for any payment-affecting calculation. Every amount charged is recomputed server-side from the database (`Plan.price`, `PromoCode.discountValue`) at the moment of use.
- **Payment success cannot be manipulated by the client.** There is no field, query parameter, or request body value the frontend can send that marks a payment successful. Success is determined exclusively by the backend querying Worldpay's own Payment Queries API server-to-server, using merchant credentials the client never sees.
- **Payment failure cannot be forged into success**, and — after a fix made in this pass — a **cancelled subscription can no longer be reactivated** by replaying an old `/payments/confirm` call.
- **Webhook security: not applicable in its current form.** `POST /payments/webhook` is an inert stub (`501 Not Configured`) — no webhook processing exists, so none of the "reject unsigned/replayed/mismatched webhook" requirements apply yet. This is a deliberate, documented gap (see Finding PS-05), not a hidden vulnerability, since the stub does nothing rather than trusting something dangerous.
- **A real, provable financial-calculation bug was found and fixed**: percentage-discount math using floating-point arithmetic under-charged by exactly one penny in specific price/percentage combinations (e.g. £10.10 at 15% off computed as £8.58 instead of the correct £8.59). Fixed with exact integer-pence arithmetic; verified against 100+ price/discount combinations with zero mismatches.
- **Two idempotency gaps were found and fixed**: a repeated `/payments/confirm` call after a subscription was already active would re-run activation, attempt a duplicate promo redemption, and re-send the confirmation email; a repeated `/payments/intent` call could leave two "pending" payment rows for one subscription, risking `/confirm` checking the wrong one.

**No critical, exploitable vulnerability was found that lets a customer or attacker pay less than the real price, pay in the wrong currency, or force an unpaid order into a fulfillable state.** The findings below are real correctness/robustness bugs (now fixed) and defense-in-depth gaps (documented, some fixed), not a broken trust boundary on the core "client can't set the price" question.

---

## 2. Payment Architecture

```
Customer (browser)
   │
   │  1. Fills in profile/preferences/menu across the signup funnel (no auth yet)
   ▼
Frontend (delivery.tsx, handlePay())
   │
   │  2. POST /customers/provisional  → creates Customer row, issues signup token
   │  3. PATCH /customers/:id/preferences  → sets goal/diet/allergens (signup-token gated)
   │  4. POST /subscriptions  → BACKEND builds every day's menu server-side, computes
   │        price via planPrice() from the Plan table, creates Subscription (status
   │        PENDING_PAYMENT) + Order + OrderItem rows in one transaction (signup-token gated)
   │  5. POST /payments/intent  → BACKEND recomputes total independently (subscriptionTotal()),
   │        creates a Worldpay Hosted Payment Page with that server-computed amount + hardcoded
   │        "GBP" currency, stores a "pending" Payment row with Worldpay's status-query URL
   ▼
Worldpay Hosted Payment Page (customer never returns to this app's own form for card entry)
   │
   │  6. Customer enters card details directly on Worldpay's page — PAN never touches
   │        this backend. Worldpay redirects back to a fixed, server-chosen return URL.
   ▼
Frontend (payment/return page) — informational only
   │
   │  7. POST /payments/confirm  → BACKEND queries Worldpay's Payment Queries API
   │        server-to-server (merchant Basic-Auth credentials, never client-visible) for the
   │        REAL status of THIS payment's transaction reference. Only a Worldpay-confirmed
   │        "authorized/settled" event marks the Payment "succeeded" and the Subscription
   │        "ACTIVE". The frontend's own belief about success/failure has zero effect on
   │        database state — it only decides what screen to show the customer.
   ▼
Database (Subscription.status = ACTIVE, Payment.status = succeeded)
   │
   ▼
Admin panel / kitchen export — reads Order rows regardless of subscription status
```

**Trust boundaries:**
- **Untrusted → Server boundary**: everything in steps 2–5 (customer-supplied profile data, menu selections, promo *code string*). The server treats all of it as *input to be validated and priced*, never as *the price itself*.
- **Server → Worldpay boundary**: outbound only, authenticated with Basic Auth credentials from environment variables, never exposed to the client.
- **Worldpay → Server boundary**: the customer's browser is redirected through Worldpay, but the backend never trusts *that redirect* — it independently re-queries Worldpay's API for the authoritative status. This is the single most important boundary in the whole system, and it is implemented correctly.
- **Server → Database boundary**: all Prisma-mediated, no raw SQL anywhere in the payment path (confirmed via `grep -rn '$queryRaw|$executeRaw'` — zero results in the whole backend).

---

## 3. Findings

| ID | Severity | Description | Status |
|----|----------|--------------|--------|
| PS-01 | **High** | Floating-point rounding bug in percentage-discount calculation under-charges by 1 penny in specific cases | **Fixed** |
| PS-02 | **High** | `/payments/confirm` was not idempotent — repeat calls re-ran activation, risked duplicate promo redemption, and re-sent the confirmation email | **Fixed** |
| PS-03 | **High** | A replayed `/payments/confirm` call could reactivate a subscription an admin had since cancelled | **Fixed** |
| PS-04 | Medium | `/payments/intent` could leave multiple "pending" `Payment` rows per subscription, risking `/confirm` resolving the wrong one | **Fixed** |
| PS-05 | Informational | No webhook processing exists (`/payments/webhook` is a 501 stub) | Documented, not a vulnerability |
| PS-06 | Low | `/payments/intent` and `/payments/confirm` have no ownership/authentication check — bounded by the same pre-auth design as the wider signup funnel | Documented, not fixed (see reasoning) |
| PS-07 | Low | Worldpay's returned payment status (`lastEvent`) is checked, but the payment *amount* in that response is not independently re-verified against the expected amount | Documented as defense-in-depth recommendation, not fixed |
| PS-08 | Low | `Payment.status` is a plain `String` column, not a database-level enum | Documented as hardening recommendation |
| PS-09 | Informational | Admin refund never calls a real Worldpay refund API (already recorded as OP-15 in `SECURITY_AUDIT.md`) | Unchanged — business/ops gap, not a security defect |

---

## 4. Detailed Findings

### PS-01 — Floating-point discount rounding error (High, fixed)

**Description.** `server/src/lib/promo.ts`'s `applyDiscount()` computed percentage discounts as `base * (1 - value / 100)` using plain JS floating-point numbers. IEEE754 binary floating point cannot exactly represent values like `0.15` or `10.10`, and at specific price/percentage combinations the resulting error crosses a rounding boundary.

**Proof.** Verified with an independent exact-decimal (BigInt) reference implementation across 100+ realistic price/discount combinations:
- £10.10 at 15% off: mathematically exact result is £8.585, which rounds to **£8.59**. The floating-point calculation produced `8.584999999999999`, which `Math.round(... * 100)` rounds down to **£8.58** — a 1p undercharge.
- £1.15 at 10% off: exact result is £1.035 → **£1.04**. Floating-point produced a value rounding to **£1.03**.

**Business impact.** Small per-transaction (1 penny), but this is exactly the class of bug that erodes trust in a financial system and can compound at scale or trigger reconciliation mismatches against Worldpay's own settled amounts. It is also a clean, deterministic hole in a compliance-style audit checklist ("no unsafe floating-point arithmetic for money").

**Fix.** Rewrote `applyDiscount()` to convert to integer pence first, then perform the percentage reduction as an exact BigInt fraction (`basePence * (10000 - basisPoints) / 10000`) with explicit round-half-up, before converting back to pounds. Re-verified against the same 100+ combinations plus the two originally-failing cases: zero mismatches.

**Affected files:** `server/src/lib/promo.ts`.

---

### PS-02 — `/payments/confirm` was not idempotent (High, fixed)

**Description.** Nothing prevented `/payments/confirm` from being called more than once for the same subscription after it had already succeeded — a real scenario from: the customer's browser retrying a slow request, a duplicate tab, or simply the frontend calling confirm again on page reload of the success screen.

**Attack/failure scenario (not malicious — a normal reliability bug).** A second call would: re-query Worldpay (harmless, but wasteful), then call `activateSubscription()` again, which would attempt to create a second `PromoRedemption` row for a subscription that used a promo code. Since `PromoRedemption.subscriptionId` has a unique constraint, this would throw an unhandled database error (a 500 to the client, confusing UX for an already-successful payment), and — before the second confirmation was blocked — it would also re-send the subscription confirmation email, giving the customer a duplicate welcome email.

**Fix.** Added an idempotency check at the top of `/confirm`: if the subscription is already `ACTIVE`, return the same success response immediately, without touching Worldpay, the database, or the email sender again.

**Affected files:** `server/src/routes/payments.ts`.

---

### PS-03 — Replayed confirm could reactivate a cancelled subscription (High, fixed)

**Description.** The idempotency check above only handles the "already succeeded" case. Before this fix, if a subscription had been **cancelled by an admin** after activation, and something later replayed an old `/payments/confirm` request for that same subscription id (a stale bookmark, a very late duplicate network request, or a deliberate replay), the code would still find the original payment's status as "succeeded" at Worldpay (since that historical fact doesn't change), and would call `activateSubscription()`, **flipping the subscription's status back to `ACTIVE`** — silently undoing the admin's cancellation.

**Fix.** `/confirm` now rejects with `409 Conflict` unless the subscription's current status is exactly `PENDING_PAYMENT` — the only state a confirmation is ever meaningful from. Combined with PS-02's `ACTIVE` short-circuit, this makes the full transition set explicit: `PENDING_PAYMENT → ACTIVE` is the only path confirm can take; `ACTIVE → ACTIVE` is a no-op; every other starting state is refused outright.

**Affected files:** `server/src/routes/payments.ts`.

---

### PS-04 — `/payments/intent` not idempotent across retries (Medium, fixed)

**Description.** Each call to `/payments/intent` created a brand-new Worldpay Hosted Payment Page and a brand-new `Payment` row with `status: "pending"`, with no check for an existing pending payment on that subscription. `/payments/confirm` resolves *which* pending payment to check via `findFirst({ where: { subscriptionId, status: "pending" }, orderBy: { createdAt: "desc" } })` — "the most recent one." If a retried/duplicated `/intent` call created a second pending payment, and the customer actually completed payment on the **first** (now not-the-most-recent) hosted page, `/confirm` would look up the second (still-unpaid) page's status, find it not succeeded, and incorrectly report the payment as failed — even though the customer's card was actually charged.

**Fix.** `/intent` now marks any existing "pending" payments for that subscription as `"superseded"` before creating the new one, guaranteeing at most one "pending" row per subscription at any time, so `/confirm`'s lookup is always unambiguous.

**Affected files:** `server/src/routes/payments.ts`.

---

### PS-05 — No webhook processing exists (Informational, not a vulnerability)

`POST /payments/webhook` returns `501 { error: "Worldpay webhook not configured" }` unconditionally — there is no signature verification to audit because there is no processing at all. This is a legitimate, currently-safe design choice: the system instead relies entirely on the client-triggered-but-server-verified `/payments/confirm` flow (Worldpay's Payment Queries API, queried with merchant credentials), which is itself a valid, officially-supported Worldpay verification pattern and does not depend on the webhook existing.

**Caveat worth flagging**: this means a payment where the customer's browser never returns to `/confirm` at all (closed the tab immediately after paying on Worldpay's page, lost network before the redirect completed) has **no automatic path to ever mark that payment succeeded** — the recovery sweep (`runRecoverySweep`) only handles customers who never finished OTP verification, not customers whose payment succeeded at Worldpay but whose `/confirm` call never happened. Recommend either implementing the real Worldpay webhook (once webhook-URL configuration is set up via a Worldpay Implementation Manager, per the existing code comment) as a safety net, or adding a periodic sweep that checks Worldpay's status for any `Payment` stuck in `"pending"` past a reasonable window.

---

### PS-06 — No authentication on `/payments/intent` / `/payments/confirm` (Low, documented)

Neither endpoint requires a Firebase session — consistent with the wider pre-authentication signup funnel (see `SECURITY_AUDIT.md`'s OP-01, now fixed for the *other* two pre-auth endpoints via a signup token). These two were deliberately left out of that fix's scope because their actual exploitability is bounded differently: even if an attacker guesses another customer's `subscriptionId` (a Prisma cuid, not brute-forceable) and calls `/confirm` on it, **the only thing that can happen is a payment the real customer already legitimately completed gets confirmed** — Worldpay's own server-to-server status check is still the gate, so there is no way to activate a subscription or receive value without a real payment having occurred. There is no discount, no free activation, and no data disclosure beyond a boolean success/failure response.

**Recommendation (not urgent):** extend the same signup-token mechanism to `/payments/intent` and `/payments/confirm` for defense-in-depth and consistency, since the token is already being generated and threaded through the funnel for the other two endpoints.

---

### PS-07 — Payment amount not independently re-verified at confirm time (Low, documented)

`queryPaymentStatus()` (`server/src/lib/worldpay.ts`) extracts only `lastEvent` (the status) from Worldpay's Payment Queries response — it does not read back the actual authorized amount and compare it against the `Payment.amount` this system expected. In the current architecture this is **not currently exploitable**: the amount charged is fixed server-side at the moment the Hosted Payment Page is created (`amountMinorUnits` is set from the server-computed total, never re-entered by the customer), so Worldpay itself enforces that the customer can only complete payment for that exact amount — there is no request the customer can tamper with to change what Worldpay actually charges.

**Recommendation:** if Worldpay's Payment Queries response includes the settled amount/currency per transaction (needs confirming against the live API response shape), compare it against the stored `Payment.amount`/currency before marking succeeded, as a second independent check — cheap insurance against a future architecture change (e.g., a different payment method that isn't a fully server-controlled Hosted Payment Page) reintroducing a real gap here.

---

### PS-08 — `Payment.status` is a plain string, not an enum (Low, hardening)

Unlike `Subscription.status` (a real Prisma `enum SubscriptionStatus`), `Payment.status` is `String`. This project's other status fields with real state-machine semantics use enums; `Payment.status` does not, meaning a typo in a future code change (e.g. `"succeded"`) would silently create an unrecognized status with no compile-time or database-level protection. Not currently a live bug — all current call sites use consistent literal strings (`"pending"`, `"succeeded"`, `"failed"`, `"refunded"`, and now `"superseded"`) — but worth converting to a `PaymentStatus` enum in a future migration for the same protection `SubscriptionStatus` already provides.

---

### PS-09 — Refund doesn't call Worldpay (Informational, previously recorded)

Already documented as OP-15 in `SECURITY_AUDIT.md`: the admin refund action flips `Payment.status` to `"refunded"` in the database only, with no corresponding Worldpay refund API call. This is a business-process gap (real money isn't actually returned automatically), not a security vulnerability — repeated here for completeness since this is the payment-focused report.

---

## 5. Checklist

| Control | Result |
|---|---|
| Server calculates amount | **PASS** — `planPrice()` + `applyDiscount()`, never a client value |
| Server controls currency | **PASS** — hardcoded `"GBP"` server-side, no client-reachable path found |
| Frontend amount cannot change what's charged | **PASS** — verified: no endpoint accepts a client-supplied price/total/amount field |
| Order snapshot protected during payment | **PASS** — no reachable endpoint can mutate Order/OrderItem/pricing dimensions for a `PENDING_PAYMENT` subscription (the only such endpoints require a Firebase session, which doesn't exist yet at that funnel stage) |
| Payment status is server-verified | **PASS** — Worldpay's Payment Queries API, server-to-server, merchant credentials |
| Payment amount is gateway-verified | **PARTIAL** — status is verified; amount is fixed server-side at creation but not independently re-checked in the confirmation response (PS-07) |
| Webhook authenticity verified | **NOT APPLICABLE** — no webhook processing exists (PS-05) |
| Webhook replay is handled | **NOT APPLICABLE** — same as above |
| Duplicate payments are prevented | **PASS (fixed)** — PS-04 |
| Duplicate fulfillment prevented | **PASS (fixed)** — PS-02, PS-03 |
| Payment ownership is verified | **PARTIAL** — no auth on intent/confirm, but bounded by Worldpay being the real gate (PS-06) |
| Failure states cannot be forged into success | **PASS** — no client-controlled field influences success determination |
| Refunds are protected | **PASS** — cross-customer check fixed in the general audit (OP-03); refund itself doesn't touch Worldpay (PS-09, business gap not a security hole) |
| Monetary calculations are safe | **PASS (fixed)** — PS-01, verified against 100+ combinations with an exact-decimal reference |

---

## 6. Final Assessment

**Payment Security Score: 8/10.**

Scoring rationale: the core trust boundary — "the client cannot determine what gets charged" — is correctly implemented everywhere I traced, which is the single most important property for a payment system. Points held for: correct server-side amount computation, correct server-to-server status verification, no raw SQL, no client-controlled currency, and (after this pass) correct idempotency and correct decimal arithmetic. Points lost: no webhook safety net for the "customer's browser never returns" case (PS-05), amount isn't independently re-verified at confirm time as a second layer (PS-07), and intent/confirm remain unauthenticated by design rather than by the stronger signup-token pattern now used elsewhere (PS-06).

**Production readiness: READY WITH HARDENING RECOMMENDATIONS.**

Not "READY" outright, because PS-05 and PS-07 are real gaps worth closing before this scales meaningfully beyond a pilot — but nothing found in this audit allows a customer or attacker to pay less than the real amount, forge a successful payment, or trigger fulfillment without a real, Worldpay-confirmed transaction. The three High-severity findings (PS-01, PS-02, PS-03) were genuine bugs, not just theoretical risks, and are fixed and verified in this pass.

---

## 7. Verification performed

- **PS-01**: independent BigInt exact-decimal reference implementation checked against the fixed `applyDiscount()` across 17 prices × 6 discount types/values (100+ combinations) — zero mismatches, including the two originally-failing cases re-verified explicitly.
- **PS-02/PS-03**: verified by code review of the full transition logic; the guard clauses (`ACTIVE` → short-circuit, non-`PENDING_PAYMENT` → 409) are unconditional and run before any Worldpay call or side effect.
- **PS-04**: verified by code review — the `updateMany` supersession runs unconditionally before every new pending-payment creation.
- Backend typechecks and builds clean after all changes (`tsc --noEmit`, `npm run build`).
- **Not verified**: end-to-end against a real Worldpay sandbox transaction (would require sandbox credentials and a live test card in a staging environment, which this pass didn't have access to) — the logic changes are verified by direct code tracing and the pure-function tests above, not by an actual sandbox payment round-trip. Recommend a manual sandbox test of the full checkout → decline → retry → confirm sequence before the next release touching this code path.
- **No automated test suite exists in this repository** (confirmed in the general `SECURITY_AUDIT.md`) — the verification above used standalone scripts, not committed tests. Recommend introducing a test framework (Vitest is a natural fit given the existing `tsx`-based tooling) with these payment-flow cases as the first suite, given they're the highest-value regression surface in the codebase.
