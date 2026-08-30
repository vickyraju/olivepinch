# OlivePinch Security Audit

**Date:** 2026-08-30
**Scope:** `olivepinch-backend` (Express/Prisma/PostgreSQL API), `olivepinch/admin` (React admin panel), `olivepinch-ui-change` (React customer site)
**Method:** Manual white-box source review (all three repos read directly) plus live verification against the deployed admin panel and API where noted. No automated exploit tooling (Strix) was run against this codebase — see "Coverage" below.

This report follows the convention: **Confirmed** (read the code, traced the full path, certain), **Probable** (strong evidence, one assumption unverified — e.g. a runtime env var I could not read), **Potential** (plausible but needs live testing to prove), **Recommendation** (best-practice hardening, not a vulnerability today).

---

## Executive Summary

The backend is generally well-built for its size: every admin route is uniformly gated behind `requireAdminAuth`, customer self-service routes correctly scope every query to `req.customerId` (never a client-supplied id), there is **zero raw SQL** anywhere (all access goes through Prisma's parameterized query builder), server-side pricing is correctly recomputed and never trusted from the client, and neither frontend contains a single `dangerouslySetInnerHTML`/`innerHTML`.

Against that, this review found **one Critical-class finding**: two pre-authentication endpoints (`POST /subscriptions`, `PATCH /customers/:id/preferences`) accept a customer identifier from the request itself with **no proof of ownership at all** — anyone who obtains a customer's id can create subscriptions on their account, overwrite their delivery address and email, and clear their allergen list. This is a real Broken Object-Level Authorization (BOLA/IDOR) gap, not a theoretical one, and it touches safety-critical data (allergens feed directly into automatic meal selection). It has **not** been fixed in this pass — the correct fix changes the pre-authentication signup funnel's contract between frontend and backend, and I did not want to make that change silently. See Finding OP-01 for the recommended approach and the decision this needs from you.

Seven other issues were confirmed and **fixed directly** in this pass (all low-risk, non-breaking): a hardcoded fallback JWT secret, a non-timing-safe cron-secret comparison, missing `trust proxy` (breaks per-IP rate limiting on Render), a CORS wildcard fallback, unexpected-error message leakage to clients, missing JWT algorithm pinning, and a cross-customer authorization gap in the admin refund endpoint. Everything else is either a Recommendation for later hardening, or is explicitly marked as unverified because it depends on a Render environment variable I could not read (the sandbox's permission classifier blocks reading live secrets, which is itself the correct behavior).

### Immediate priorities
1. **Decide on OP-01** (unauthenticated subscription/preferences endpoints) — this is the one finding that needs your input before I touch it, because the fix changes a live, paying-customer funnel.
2. Confirm `JWT_SECRET` and `CRON_SECRET` are actually set as strong random values in Render's environment (the code now refuses to boot without `JWT_SECRET` in production, so this is partially self-verifying going forward).
3. Confirm `WORLDPAY_USERNAME`/`PASSWORD`/`ENTITY` are genuinely set in Render — if unset, `/payments/confirm` silently activates subscriptions with zero real payment (OP-05).

## Security Score: **6/10**

**Methodology:** I'm scoring against "would I be comfortable calling this production-ready for a business handling PII, health data, and payments" — not against a hypothetical enterprise SaaS bar. Points lost:
- **-2** for OP-01 (unauthenticated cross-customer write access to safety-relevant data — this alone would fail most compliance reviews).
- **-1** for the payment dev-fallback + missing-secret-fallback pattern (OP-05, OP-02) being real-if-misconfigured rather than structurally impossible.
- **-0.5** for missing rate limiting granularity (login, OTP-adjacent enumeration endpoint, cron endpoints all share one generic global limiter).
- **-0.5** for dependency vulnerabilities with no fix currently applied (`xlsx`, `ip-address` chain).
Points held: consistent admin auth, no SQL injection surface, no raw XSS sinks in either frontend, correct server-side price computation, real Firebase token verification (not trusting client-asserted identity), GDPR-shaped self-service export/delete already implemented correctly.

This is not a 9 or 10 out of 10 codebase, but it is also not a codebase with sloppy fundamentals — the pattern is "mostly-consistent, one real gap," which is a fixable, bounded problem, not a rewrite.

---

## Architecture Review

**Trust boundaries:**
- **Public internet → Backend (`/api/*`)**: no boundary beyond the generic 120 req/min global limiter for most catalog/pricing/postcode routes (intentionally public — pricing estimate, postcode check, menu catalog, delivery slots, allergen list).
- **Public internet → Backend (customer-authenticated)**: gated by Firebase ID token, verified server-side against Firebase on every request (`requireAuth`) — never trusts a client-asserted customer id. Strong boundary where applied.
- **Public internet → Backend (pre-authentication funnel)**: `POST /customers/provisional`, `POST /subscriptions`, `PATCH /customers/:id/preferences` — **this is the weak boundary** (OP-01). The design intent (a "provisional" customer record exists before OTP verification, so a payment-succeeds-but-signup-abandoned customer still has a recoverable record) is reasonable; the implementation currently has no secret binding the caller to the specific customer id they're allowed to act on.
- **Public internet → Backend (admin)**: JWT Bearer, verified locally against `JWT_SECRET`. Consistently applied via `.use(requireAdminAuth)` on every admin sub-router — checked all 11 admin route files, no exceptions found.
- **Public internet → Backend (internal/cron)**: shared bearer secret (`CRON_SECRET`), fails closed if unset, now timing-safe (fixed in this pass).
- **Backend → Worldpay**: outbound only, credentials from env, payment status pulled server-to-server (not trusted from client redirect).
- **Backend → Firebase**: outbound token verification (Admin SDK), server is the verifier, never trusts a client-decoded token.
- **Backend → Postgres**: via Prisma only, no raw SQL anywhere in either the `src/` tree.

**Data flows:** Customer → (frontend, sessionStorage for in-progress signup state only) → API → Prisma → Postgres. Payment: frontend → `/payments/intent` (server computes total, creates Worldpay hosted page) → customer redirected to Worldpay directly (card data never touches this backend) → `/payments/confirm` (server queries Worldpay's own status API, never trusts the redirect itself).

**External integrations:** Firebase (customer identity), Worldpay (payments, Access Hosted Payment Pages), Resend/nodemailer (email), no analytics/tracking third parties found in either frontend.

**Sensitive assets:** `Customer` table (PII + special-category health data: height/weight/allergens/goal/DOB), `Payment` table (amounts, provider refs — no card data, Worldpay hosted pages keep PAN out of this system entirely, which is correct), `AdminUser.passwordHash` (bcrypt, cost 12 — appropriate).

---

## Findings Table

| ID | Severity | Area | Finding | Exploitability | Impact | Status |
|----|----------|------|---------|-----------------|--------|--------|
| OP-01 | **Critical** | AuthZ / BOLA | `POST /subscriptions` and `PATCH /customers/:id/preferences` accept a customer id with no ownership proof | Confirmed in code; requires knowing/guessing a cuid (not brute-forceable, but not a real authorization boundary either) | Overwrite victim's email/address, tamper with allergen safety data, create phantom subscriptions | **Not fixed — needs your decision** |
| OP-02 | Critical (if unset) | Secrets | `JWT_SECRET` had a hardcoded fallback string | Confirmed in code; only exploitable if the env var is unset in prod | Full admin-token forgery → complete admin takeover | **Fixed** (fails to boot without it in production) |
| OP-03 | High | AuthZ | Admin refund endpoint didn't verify the payment belonged to the customer in the URL | Confirmed in code | Wrong-customer refund possible, audit-log misattribution | **Fixed** |
| OP-04 | High | Platform config | `trust proxy` never set; behind Render's proxy this breaks per-IP rate limiting | Confirmed in code | Rate limiting either applies to all traffic as one bucket or is bypassable | **Fixed** |
| OP-05 | High (if misconfigured) | Payments | Dev-mode payment auto-succeed path has no `NODE_ENV` guard, only env-var presence | Confirmed in code; requires Worldpay env vars to be unset in production | Free subscription activation with zero real payment | **Documented, not changed** (see below — this is intentional dev behavior; recommendation is defense-in-depth, not a bug fix) |
| OP-06 | Medium | Crypto | Cron secret compared with `!==` instead of a timing-safe comparison | Confirmed in code | Timing side-channel on a long-lived, unrotated secret | **Fixed** |
| OP-07 | Medium | Config | CORS fell back to wildcard `*` if `CORS_ORIGIN` unset | Confirmed in code | Any origin could call the API (no cookie-based session to steal, so limited practical impact, but unnecessarily permissive) | **Fixed** |
| OP-08 | Medium | Info disclosure | Unhandled (500) errors returned raw `err.message` to the client, including upstream API response bodies | Confirmed in code | Internal detail (Prisma errors, Worldpay response text) exposed to any caller who triggers a 500 | **Fixed** |
| OP-09 | Medium | Crypto | `jwt.verify`/`jwt.sign` didn't pin `algorithms: ["HS256"]` | Confirmed in code; not currently exploitable (no RS256 keys exist anywhere in this system) | Defense-in-depth against algorithm-confusion class of attacks | **Fixed** |
| OP-10 | Medium | Export | Kitchen-export `.xlsx` wrote customer-controlled `fullName` as a raw cell value with no formula-injection guard | Confirmed in code; real-world Excel behavior for OOXML string cells (vs. CSV) not independently re-verified against this exact ExcelJS version | Potential formula/DDE execution if an admin opens a maliciously-named customer's export | **Fixed** (defense-in-depth sanitization added regardless of exact exploitability) |
| OP-11 | Low | Enumeration | `POST /customers/check-phone` is an unauthenticated account-existence oracle | Confirmed in code | Attacker can map which phone numbers have an OlivePinch account | Not fixed — flagged as Recommendation |
| OP-12 | Low | Auth hardening | No login-specific rate limit/lockout on `/admin/auth/login` beyond the generic global limiter | Confirmed in code | Slow, generic-limiter-bounded brute force against admin passwords | Not fixed — flagged as Recommendation |
| OP-13 | Low | Storage | Admin JWT stored in `localStorage`, not an httpOnly cookie | Confirmed in code; no XSS vector currently exists to exploit it | If an XSS vector is ever introduced (dependency compromise, future `dangerouslySetInnerHTML`), the token is directly readable by JS | Not fixed — architectural tradeoff (cookies would need CSRF protection added), flagged for roadmap |
| OP-14 | Low | Data integrity | `activateSubscription` isn't fully idempotent — a duplicate `/payments/confirm` call after success 500s instead of returning cleanly (blocked by `PromoRedemption.subscriptionId` unique constraint, which is itself correct) | Confirmed in code | Benign double-click/retry produces a 500 instead of an idempotent 200 | Not fixed — Low, cosmetic |
| OP-15 | Low | Business logic | Admin refund flips `Payment.status` to `"refunded"` in the DB but never calls a Worldpay refund API | Confirmed in code (no refund function exists in `lib/worldpay.ts`) | Real money is not actually returned to the customer; DB and payment-provider state diverge | Not fixed — product/ops gap, not itself an attack vector |
| OP-16 | Informational | Dependencies | `xlsx` (admin panel): prototype pollution + ReDoS, **no fix available** from upstream | From `npm audit` | Only reachable via the admin's own postcode-zone CSV/XLSX import feature, admin-only surface | Not fixed — no fix exists; see recommendation |
| OP-17 | Informational | Dependencies | `react-router`/`react-router-dom` (both frontends): CSRF-bypass advisory in RSC mode (not used here) | From `npm audit` | This app doesn't use React Router's RSC mode, so likely not reachable, but a fixed version is available | Not fixed — trivial low-risk upgrade, recommend doing it |
| OP-18 | Informational | Dependencies | Backend: `deepmerge-ts`/`ip-address`/`uuid` transitive advisories via `prisma`(dev-only)/`firebase-admin`/`exceljs` | From `npm audit` | `ip-address` SSRF-adjacent advisory is inside `firebase-admin`'s Google Cloud Storage client, not directly reachable by attacker input in this app's flows | Not fixed — see recommendation |

---

## Detailed Findings

### OP-01 — Unauthenticated cross-customer write access (Critical, not fixed)

**Description.** Two endpoints accept a customer identifier as plain request data with no proof the caller is that customer:

- `PATCH /customers/:id/preferences` (`server/src/routes/customers.ts:135`) — takes `:id` from the URL with zero auth middleware and zero ownership check. Body: `{ goal, dietTypes, allergens, postcode }`.
- `POST /subscriptions` (`server/src/routes/subscriptions.ts:41`) — registered *before* `subscriptionsRouter.use(requireAuth)` at line 138, so it runs with no auth at all. Takes `customerId` directly in the body, and on success **overwrites** that customer's `email`, `addressDoorNumber`, `addressBuildingName`, `addressStreet`, `addressArea`, `addressPostcode` (lines 121–131).

**Attack scenario.** An attacker who has, by any means, observed a customer's `customerId` (a Prisma `cuid` — not brute-forceable, but also never treated as a secret anywhere in this codebase, so it can leak via a support ticket, a shared screenshot, browser history on a shared device, a referral link, or a future logging/analytics integration) can:
1. `PATCH /customers/<victim-id>/preferences` with `allergens: []` — silently clears the victim's allergen list. The next default meal generated via `defaultMenuItemFor` (`server/src/lib/pricing.ts`) will no longer filter out their real allergens. This is not a data-privacy bug, it's a physical-safety bug.
2. `POST /subscriptions` with `customerId: "<victim-id>"` and attacker-controlled address fields — redirects the victim's future meal deliveries to the attacker's address, and overwrites the victim's email.

Neither call requires a Firebase token, a password, or anything beyond the id itself.

**Why it exists.** This is a real design tension, not carelessness: the funnel deliberately creates a "provisional" `Customer` row (`POST /customers/provisional`) *before* the customer finishes Firebase OTP verification, specifically so a payment-succeeds-but-signup-abandoned customer has something to recover into (see the `runRecoverySweep` cron job and the comment at `customers.ts:80`). That means at the point `POST /subscriptions` and `PATCH /:id/preferences` are called, there genuinely is no Firebase session yet — `requireAuth` isn't available to protect them the normal way.

**Recommended remediation (needs your decision, not implemented).** Bind the caller to the specific customer id they're allowed to act on for the rest of the pre-auth funnel, without requiring full Firebase verification yet:
- Have `POST /customers/provisional` return a short-lived, signed token (e.g. a JWT with `{ customerId, purpose: "signup" }`, a short expiry — the funnel takes minutes, not days) alongside `customerId`.
- Require that token as a Bearer header on `POST /subscriptions` and `PATCH /customers/:id/preferences`, and verify it matches the `:id`/`customerId` in the request.
- This closes the hole without requiring OTP verification before payment, preserving the existing recovery-sweep design.

This touches both the backend (new token issuance + a new lightweight auth middleware) and the frontend `subscribe-context.tsx` (store and forward the token through the funnel), and changes the contract of a live, paying-customer flow — that's why I'm flagging it rather than shipping it in this pass. Tell me if you want me to implement this now, or want to discuss the approach first.

**Affected files:** `server/src/routes/customers.ts:135`, `server/src/routes/subscriptions.ts:41-136`.

---

### OP-02 — Hardcoded JWT secret fallback (Critical if unset, fixed)

**Before:** `server/src/lib/auth.ts:4` — `const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-secret-change-in-production"`. If `JWT_SECRET` were ever unset on Render (a config typo, a redeploy that dropped an env var, a new environment stood up from a template), every admin JWT would be signed and verified with a secret visible in this very file — anyone with repo access (or this audit) could mint a valid admin token for any `adminId` and get full admin-panel access.

**Fix applied:** the app now throws at startup if `JWT_SECRET` is unset and `NODE_ENV === "production"`. The dev fallback still works locally. This can't silently regress — a missing secret in production now means "the server won't start," not "the server runs insecurely."

**Verification needed from you:** confirm `JWT_SECRET` is actually set to a strong random value in Render's environment variables today (I could not read it — see Coverage).

---

### OP-03 — Admin refund not scoped to the URL's customer (High, fixed)

`POST /admin/customers/:id/refund` (`server/src/routes/admin/customers.ts`, ~line 173) updated `Payment` by `paymentId` alone, never checking it belonged to `:id`. An admin (or a compromised admin session) supplying a `paymentId` for a different customer than the one in the URL would refund the wrong payment, and the audit log (`logAction(..., req.params.id, ...)`) would record it against the wrong customer — an audit-integrity problem, not a privilege escalation (admins can already see/act on every customer). Fixed by adding a `findFirstOrThrow({ where: { id: paymentId, customerId: req.params.id } })` ownership check before the update.

---

### OP-04 — Missing `trust proxy` (High, fixed)

`server/src/server.ts`/`app.ts` never called `app.set("trust proxy", ...)`. Render terminates TLS and proxies to the app, so without this, Express's `req.ip` (which `express-rate-limit`'s default key generator uses) resolves to Render's proxy address for every request, not the real client. Effect: the global 120 req/min limiter either buckets all traffic together (one bad actor exhausts everyone's budget) or is trivially bypassed, depending on the exact proxy behavior. Fixed with `app.set("trust proxy", 1)` (trusts exactly one hop, correct for Render's single-proxy setup).

---

### OP-05 — Payment dev-mode fallback has no environment guard (High if misconfigured, documented not changed)

`server/src/lib/worldpay.ts:9` — `worldpayConfig` is `null` whenever any of `WORLDPAY_USERNAME`/`PASSWORD`/`ENTITY` is unset, and `payments.ts`'s `/confirm` endpoint has a genuine `else` branch that **unconditionally marks the payment succeeded and activates the subscription** when `worldpayConfig` is null — by design, so checkout is testable without real credentials.

This is legitimate, intentional, and already self-labeled in the code (`// ponytail: ... falls back to a dev-mode auto-succeed path`). The concern is purely structural: the only thing standing between "real payment required" and "anyone can activate any subscription for free" is three environment variables being present, with no `NODE_ENV` check as a second layer. I did not add that guard myself in this pass, because I cannot verify from code alone whether it would ever trigger in production — this codebase's own live Reports dashboard shows real revenue and real customers, which is strong indirect evidence Worldpay credentials **are** configured in production today. Recommendation: gate the fallback additionally behind `process.env.NODE_ENV !== "production"`, so a future accidental env-var removal fails loudly (missing config error) instead of silently granting free subscriptions.

---

### OP-06 — Non-timing-safe cron secret comparison (Medium, fixed)

`server/src/routes/internal.ts` compared the `Authorization` header to the expected value with `!==`, which short-circuits on the first mismatched byte — in principle leaking how many leading characters matched via response timing. `CRON_SECRET` is long-lived (no rotation mechanism) and only rate-limited by the generic global limiter, so this isn't purely theoretical, even though a practical network-timing attack is hard. Fixed with `crypto.timingSafeEqual` (length-checked first, since it throws on mismatched lengths rather than returning false).

---

### OP-07 — CORS wildcard fallback (Medium, fixed)

`server/src/app.ts:23` defaulted to `origin: "*"` if `CORS_ORIGIN` was unset. Since neither auth scheme here uses cookies (both are Bearer tokens attached explicitly by JS), a wildcard doesn't expose a classic cookie-theft CORS vulnerability — but it's unnecessarily permissive, and env-var-dependent security posture is fragile. Fixed: if `CORS_ORIGIN` is unset **and** `NODE_ENV === "production"`, falls back to an explicit allowlist of the two real frontend origins instead of `*`. Non-production behavior (local dev) is unchanged. If `CORS_ORIGIN` is already set in Render (likely), this change has zero effect.

---

### OP-08 — Unhandled errors leaked internal detail (Medium, fixed)

`server/src/middleware/error.ts` returned `err.message` to the client for *every* error, including uncaught 500s. Deliberately-thrown operational errors in this codebase already use a clean pattern (`Object.assign(new Error("friendly message"), { status: 400 })`), so those are safe to pass through — but genuine 500s (a `Prisma*Error`, or `worldpay.ts`'s `throw new Error(\`Worldpay HPP setup failed: ${res.status} ${await res.text()}\`)`, which embeds Worldpay's raw response body) were being sent verbatim to whoever triggered them. Fixed: only pass the message through below 500; 500s now return a generic message to the client while the full detail still goes to `console.error` for debugging.

---

### OP-09 — JWT algorithm not pinned (Medium, fixed)

`jwt.sign`/`jwt.verify` in `server/src/lib/auth.ts` didn't pass an explicit `algorithms` option. Not currently exploitable (this system only ever uses one symmetric HS256 secret, no RSA keypair exists anywhere for an algorithm-confusion attack to substitute), but pinning `algorithms: ["HS256"]` explicitly is the standard defense-in-depth recommendation regardless, and costs nothing. Fixed.

---

### OP-10 — Excel export formula-injection guard (Medium, fixed defensively)

`server/src/lib/kitchen-export.ts` wrote `Customer.fullName` (a plain signup-form field, no character restrictions) directly as an Excel cell value. Whether a genuine `.xlsx` cell assigned as a plain JS string (rather than an explicit ExcelJS `{formula: ...}` object) is actually reinterpreted as a live formula by Excel — the way a `.csv` value is on import — was **not independently re-verified against the exact pinned `exceljs` version**, so I'm not asserting this was definitely exploitable. I applied the standard OWASP-recommended mitigation anyway (prefix a leading apostrophe when the value starts with `=`, `+`, `-`, `@`, tab, or CR) since it's free and non-breaking, rather than leave it as an open question.

---

### OP-11 through OP-15 — see Findings Table above for full detail; each is Low severity, documented, and left as a Recommendation rather than changed in this pass, since none are structurally broken today (OP-11/OP-12 are missing hardening, not active holes; OP-13 is an architecture tradeoff; OP-14/OP-15 are correctness/business gaps, not exploits).

### OP-16 through OP-18 — Dependency findings

From `npm audit --omit=dev` in each of the three package.json trees:

- **Admin panel:** `xlsx@0.18.5` — prototype pollution + ReDoS, **no upstream fix exists**. Used only in `admin/src/pages/zones.tsx` for the postcode-zone import feature (admin-only, not customer-reachable) and `dashboard.tsx`'s kitchen-export download naming. Recommendation: since there's no fixed version, either restrict accepted import files more strictly (already limited to `.xlsx/.xls/.csv` by the file input's `accept` attribute, which is client-side only and not a real control) or move zone import to a safer parser if this becomes a priority; low urgency given the admin-only surface.
- **Both frontends:** `react-router`/`react-router-dom` — an RSC-mode CSRF-bypass advisory. This app doesn't use React Router's RSC mode (it's a plain Vite SPA), so it's likely not reachable, but `npm audit fix` resolves it with no breaking change — worth doing.
- **Backend:** `deepmerge-ts` (via a Prisma **dev** dependency — no production impact), `ip-address` (via `firebase-admin`'s Google Cloud Storage client — not directly reachable by attacker-controlled input in any flow this app exercises), `uuid` (via `exceljs`/`firebase-admin` transitively, moderate severity). None require urgent action; recommend `npm audit fix` (non-forced) periodically, and revisiting `--force` upgrades only with a real test pass given the breaking-change warnings.

---

## Positive Security Controls

Documenting what's already right, not just what's wrong:

- **Every admin route is behind `requireAdminAuth`.** Checked all 11 files under `server/src/routes/admin/` — no exceptions.
- **Customer self-service routes correctly scope by `req.customerId`**, never a client-supplied id — `health-logs.ts`, `customers.ts`'s `/me*` routes, `subscriptions.ts`'s routes after the auth boundary all verified.
- **Zero raw SQL.** `grep -rn '$queryRaw\|$executeRaw'` across the entire backend source returns nothing — every DB access goes through Prisma's parameterized builder.
- **Server-side pricing is the source of truth.** `subscriptionTotal()` in `payments.ts` recomputes price from `planPrice()` server-side on every intent/confirm; no client-sent amount is ever trusted.
- **Payment status is verified server-to-server.** `/payments/confirm` queries Worldpay's own status API (`queryPaymentStatus`) rather than trusting the redirect outcome or any client flag.
- **Card data never touches this backend** — Worldpay's Hosted Payment Pages keep PAN entirely off this system.
- **Firebase tokens are verified server-side on every request**, not decoded/trusted client-side (`verifyFirebaseUser` calls `firebaseAuth.verifyIdToken`, which checks against Firebase, so a server-side revoke takes effect immediately).
- **No `dangerouslySetInnerHTML` or `innerHTML`** anywhere in either frontend — checked both `src/` trees.
- **No secrets committed to git**, in any of the three repos, in current state or history (`git log --all` for `.env` paths and common secret-value patterns across all three repos came back empty).
- **GDPR self-service already correctly implemented**: `GET /customers/me/export` and `DELETE /customers/me` both exist, are auth-scoped, and the delete correctly retains payment records (UK tax law) while scrubbing everything else.
- **`validateBody`'s Zod schemas strip unknown keys by default** (Zod's default `.safeParse` behavior), which is a real mass-assignment defense on every route that uses it — not just documentation-level validation.
- **Open-redirect prevention on the payment return URL** is done correctly: `payments.ts` allowlists the *exact* return path string rather than pattern-matching a prefix, closing the whole `//evil.com`-style bypass class outright.
- **`checkCronSecret` fails closed** if `CRON_SECRET` is unset (501, not "allow through") — the same fail-safe pattern I applied to `JWT_SECRET` in OP-02 already existed here, which is why I applied it consistently rather than inventing a new pattern.

---

## Remediation Roadmap

### Immediate
- **Decide on and implement OP-01** — the unauthenticated subscription/preferences endpoints. This is the one item that needs a conversation before code changes, given it touches the live signup funnel.
- **Confirm `JWT_SECRET` and `CRON_SECRET`** are strong, random, and actually set in Render (partially self-enforcing now for `JWT_SECRET`).
- **Confirm Worldpay credentials are set in Render production** (OP-05).

### Before Production (already a live pilot, but before wider rollout)
- Add a login-specific rate limit (e.g. 5 attempts / 15 min per email+IP) to `/admin/auth/login` (OP-12).
- Add a stricter limit specifically to `/customers/check-phone` (OP-11) rather than relying on the generic global limiter.
- Add the `NODE_ENV !== "production"` guard to the Worldpay dev-fallback branch as a second layer (OP-05).
- Run `npm audit fix` (non-forced) in all three repos for the trivially-fixable advisories (OP-17).

### Hardening (longer-term)
- Consider moving admin auth from `localStorage` to an httpOnly cookie + CSRF token pair (OP-13) — real security improvement, but a genuine architecture change (cross-origin cookies between Vercel and Render need `SameSite=None; Secure` and a CSRF strategy), not a quick patch.
- Make `activateSubscription` fully idempotent (OP-14) so a duplicate `/confirm` call returns 200 instead of 500.
- Decide whether the refund endpoint should actually call a Worldpay refund API (OP-15), or whether manual/offline refunding is an accepted permanent process.
- Revisit the `xlsx` dependency (OP-16) if the admin CSV/XLSX import feature becomes higher-traffic or accepts untrusted files from a wider set of people.

---

## Coverage — what this audit did **not** do

- **No live exploitation was attempted** against the production API or either deployed frontend beyond the browser-based feature testing already done earlier in this project for unrelated feature work. Findings above are source-verified, not exploit-proven against the running system, except where explicitly noted (e.g. the admin token-storage/XSS-surface check, which *was* verified live by grepping the actual deployed bundles' source).
- **I could not read live Render environment variables** — the sandbox's own permission system blocks this, which is itself correct behavior, but it means OP-02, OP-05, and the CORS_ORIGIN question are marked "requires runtime confirmation" rather than definitively resolved.
- **Strix (the AI pentesting tool referenced earlier in this conversation) was not run** — it requires either a separate LLM API key or an app.strix.ai account, neither of which was provided, so this audit is a manual code review only, not an automated exploit-validated scan. A Strix run (or any dynamic scanner) against a staging environment would be a reasonable follow-up and could independently validate or extend these findings.
- **Dependency audit was `npm audit` only** — no SCA tool cross-check, no license-compliance review, no typosquatting analysis beyond eyeballing `package.json`.
- **No automated tests were added** for the findings above — given the scope of this pass, I prioritized finding and fixing real issues over building a regression suite around them. Recommend adding integration tests for OP-01's eventual fix at minimum (unauthorized cross-customer access must return 401/403), since that's the finding most worth protecting against regression.
