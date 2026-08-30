# OlivePinch Quality Audit

**Date:** 2026-08-30
**Scope:** All three repos — `olivepinch-backend`, `olivepinch/admin`, `olivepinch-ui-change`.
**Method:** Static analysis (`tsc --noEmit`, build verification, targeted grep-based inventory across every route/page), manual code tracing of critical flows, live browser verification of fixes against production (chrome-devtools MCP), and one-off runtime scripts for pure logic. **No load testing, no multi-session concurrency testing, no live Firebase/mobile/accessibility testing was performed** — see Coverage at the end for exactly what that means for each finding below.

This is the third audit in this series — `SECURITY_AUDIT.md` and `PAYMENT_SECURITY_AUDIT.md` already cover authorization, injection, payment-amount integrity, and payment idempotency in depth. This report does not re-litigate those; it focuses on functionality, reliability, and code quality instead.

---

## Executive Summary

The codebase is smaller and more disciplined than its size would suggest: zero raw SQL anywhere, zero explicit `any` usage in the backend, consistent server-side price computation, and a genuinely well-thought-out set of code comments explaining *why* non-obvious decisions were made (a real, unusual strength — most of this codebase's tradeoffs are self-documented, not accidental).

Against that, this pass found **one systemic, high-impact bug**: every single list page in the admin panel (10 of 11 checked) could not tell the difference between "no data" and "the request failed" — a genuinely failed fetch (expired session, backend down, network blip) silently rendered as an empty table. One page (`customer-detail.tsx`) was worse: a failed request left an infinite loading spinner with no way out. This is now fixed across 10 pages; one large, complex page (`menu-weeks.tsx`) still needs the same treatment.

Also found and fixed: a real double-click race on the two places actual money changes hands (checkout and renewal) that could create duplicate subscriptions and duplicate Worldpay payment pages, four admin forms with zero double-submit protection at all, and an unhandled database error when deleting any menu item that's ever been ordered (which is nearly all of them, since orders are created for the full plan duration upfront).

**Production readiness: the pilot can keep running.** Nothing found here is a "must stop and fix before the next customer" problem — the fixed issues were real reliability/UX bugs, not data-loss or security holes (those were already covered in the other two audits). The genuinely concerning gap for the medium term is **zero automated test coverage anywhere in any of the three repos** — every fix in all three audits this session was verified by direct tracing and one-off scripts, not a regression suite that protects them going forward.

---

## Quality Scores

| Dimension | Score | Why |
|---|---|---|
| **Functionality** | 7/10 | Core flows (signup, checkout, renewal, admin CRUD) work correctly on the happy path and the failure paths I traced. Lost points for the systemic error-state bug (now fixed) and the customer-app version of it (still open). |
| **Reliability** | 6.5/10 | Real double-submit race existed on the payment-critical checkout/renewal path (now fixed). No backend-level idempotency key protects against a determined API-level double-request bypassing the frontend fix — the frontend guard covers the realistic accidental case, not a deliberate one. |
| **Maintainability** | 8/10 | Consistent patterns across almost all admin pages (the 4 forms missing a save-guard were the exception, now fixed to match the rest). Extensive, genuinely useful inline comments explaining non-obvious tradeoffs. TypeScript strict mode is off in both frontends, which is a real but modest gap given zero actual `any` usage was found. |
| **Performance** | 6.5/10 | No N+1 queries found in the routes inspected; pagination is done correctly (DB-level `count()`, not load-everything) except one already-self-documented exception. Both frontend bundles exceed Vite's 500KB warning on every single build with zero code-splitting — fine at pilot traffic, a real problem before it scales. |
| **Test Coverage** | 1/10 | Zero automated tests in any of the three repos. Every verification in this audit (and the two before it) was a one-off script or manual browser check, not a committed regression test. |
| **Production Readiness** | 7/10 | The pilot works and the critical security/payment issues are already closed (see the other two reports). This score is held back specifically by the test-coverage gap and the still-open customer-app error-swallowing pattern, not by anything actively broken today. |

**Overall: not inflated — this is a genuinely solid pilot-stage codebase with one serious systemic UX bug (now fixed) and a real, honest gap in regression safety.**

---

## Feature Inventory (what was reviewed)

**Backend** — every route file in `server/src/routes/` and `server/src/routes/admin/` (28 files), `lib/pricing.ts`, `lib/promo.ts`, `lib/worldpay.ts`, `lib/subscription.ts`, `lib/menu-week.ts`, `middleware/*`, `prisma/schema.prisma` in full.

**Admin panel** — all 13 pages (`dashboard`, `reports`, `menu-control`, `menu-weeks`, `plans`, `customers`, `customer-detail`, `zones`, `delivery-slots`, `allergens`, `promo-codes`, `admins`, `login`), shared components (`skeleton`, `table-skeleton`, `card-grid-skeleton`, `header`, `sidebar`, `protected-route`, `trend-bar-chart`, `part-to-whole-bar`).

**Customer app** — signup funnel (`subscribe/*`), dashboard (`dashboard/*`), `lib/api.ts`, `lib/subscribe-context.tsx`, `lib/dashboard-context.tsx`, `lib/allergens.ts`, `lib/delivery-time-slots.ts`, `lib/auth.tsx`.

**Critical flows traced end-to-end:** customer signup → provisional account → subscription creation → payment intent → Worldpay → confirm → activation → email; admin login → CRUD on every resource type; renewal flow; menu-item/allergen/zone/promo-code/delivery-slot management; kitchen export.

---

## Findings Table

| ID | Severity | Area | Finding | User Impact | Status |
|----|----------|------|---------|-------------|--------|
| Q-01 | **High** | Reliability / Payments | Checkout and renewal "Pay"/"Renew" buttons only guarded by a React-state `disabled` prop, not a synchronous lock — a fast double-click could invoke the handler twice before either completed | Two separate subscriptions + two Worldpay payment pages created for one intended purchase | **Fixed** |
| Q-02 | **High** | Admin UX / Reliability | 10 of 11 admin list/detail pages checked only `isLoading`, never `isError` — a failed fetch rendered as a false empty state; `customer-detail.tsx` showed an infinite spinner instead | An admin could believe all their data was deleted, or be stuck on an unrecoverable blank/spinning screen, when the real cause was an expired session or a network blip | **Fixed (10/11 pages)** |
| Q-03 | Medium | Admin UX | 4 admin forms (Allergens, Delivery Time Slots, Zones, Promo Codes) had no `saving` state at all — unlike every other admin form in the app | Double-click or slow network could create duplicate rows | **Fixed** |
| Q-04 | Medium | Backend / Error Handling | Deleting a `MenuItem` referenced by any `OrderItem` threw an unhandled foreign-key violation (raw 500) | Admin gets a generic failure with zero explanation for something that will happen almost every time they try to delete a used item | **Fixed** |
| Q-05 | Medium | Customer App / Reliability | `useAllergens`/`useDeliveryTimeSlots` (and likely other customer-app data hooks) swallow fetch failures into a silently-empty array — no error state, no retry | A customer could see zero allergen options or zero delivery slots during signup with no indication anything went wrong | **Documented, not fixed** |
| Q-06 | Medium | Admin UX | `menu-weeks.tsx` (851-line weekly menu composer) not checked for the same error-state gap as Q-02 | Same class of risk as Q-02, unverified | **Documented, not fixed** |
| Q-07 | Low | Backend / Performance | Admin customers list, when sorted by plan-end-date (a computed field), loads the entire filtered table into memory to sort/paginate in JS | Slow at large scale; already self-documented in the code with the exact threshold to revisit | Pre-existing, acknowledged — not a new issue |
| Q-08 | Low | Code Quality | Neither frontend has `"strict": true` in `tsconfig` — `noImplicitAny` isn't enforced | No live bug found from this (zero actual `any` usage today), but the compiler isn't the safety net it could be | Documented, not fixed |
| Q-09 | Low | Testing | Zero automated tests anywhere in any of the three repos | Every fix (this audit and the two before it) relies on manual/one-off verification, not a regression suite | Documented, not fixed |
| Q-10 | Low | Performance | Both frontend bundles exceed Vite's 500KB single-chunk warning on every build (admin ~724KB, customer ~1.08MB gzipped ~220-300KB), no code-splitting anywhere | Slower initial page load, worse on slow connections; not yet a problem at pilot traffic | Documented, not fixed |
| Q-11 | Informational | Backend | No backend-level idempotency key on subscription/payment creation — Q-01's fix protects the normal browser UI, not a deliberate double API call | Low realistic risk (an attacker gains nothing from creating duplicate subscriptions for themselves) — see `PAYMENT_SECURITY_AUDIT.md` PS-06 for the same reasoning applied to a related endpoint | Documented, not fixed |
| Q-12 | Positive | Code Quality | Zero explicit `any`/`as any` anywhere in the backend; zero raw SQL anywhere; pagination correctly uses DB-level `count()` in the default path | — | No action needed |

---

## Detailed Findings

### Q-01 — Double-click race on checkout and renewal (High, fixed)

**Reproduction:** On `/subscribe/delivery`, click "Continue to Payment" twice in rapid succession (or press Enter twice on a slow device before the button visually disables).

**Expected behavior:** Exactly one subscription is created, exactly one payment attempt begins.

**Actual behavior (before fix):** `handlePay()` in `delivery.tsx` set `status` to `"checking"`/`"processing"` via React state, which is batched — a fast enough second invocation could start executing before the button's `disabled` prop had actually painted to the DOM. Each invocation independently called `POST /customers/provisional` (if first-time), `POST /subscriptions`, and `POST /payments/intent`, meaning two full subscription+order trees and two separate Worldpay hosted payment pages could be created from one click sequence. The same pattern existed in `dashboard/subscription.tsx`'s renewal flow (`handleRenew`), guarded only by the `renewing` state.

**Root cause:** A state-driven `disabled` prop is not a synchronous lock — React batches state updates, so there's a real window between "the handler started" and "the button visually reflects that."

**Fix:** Added a `useRef` boolean lock (`payingRef` / `renewingRef`) checked and set synchronously at the very top of each handler, before any state update or `await`. A ref write is immediately visible to a second invocation in the same tick, unlike state.

**Affected files:** `olivepinch-ui-change/src/pages/subscribe/delivery.tsx`, `olivepinch-ui-change/src/pages/dashboard/subscription.tsx`.

**Test status:** Verified by code tracing and `tsc`/build; **not verified with an actual rapid-double-click browser interaction** (would need a scripted sub-100ms double-click against a live checkout, which risks creating real test subscriptions on production data — not attempted).

---

### Q-02 — Failed requests rendered as false empty states across the admin panel (High, fixed for 10/11 pages)

**Reproduction (as actually tested):** Logged into the live admin panel, monkey-patched `window.fetch` to reject only requests to `/admin/allergens`, then navigated to the Allergens page.

**Expected behavior:** A visible error message and a way to retry.

**Actual behavior (before fix):** The page rendered "No allergens configured yet." — identical to genuinely having zero allergens. Every other affected page (`delivery-slots`, `zones`, `promo-codes`, `admins`, `plans`, `customers`, `menu-control`, `dashboard`, `reports`) used the same `isLoading ? <Skeleton/> : (data ?? []).length === 0 ? <Empty/> : <Rows/>` pattern, which never checks `isError` at all. `customer-detail.tsx` was structured as `if (isLoading || !customer) return <Spinner/>` — since a failed query leaves `customer` undefined forever, this produced an **infinite spinner with no escape**, not even a misleading-but-visible empty state.

**Root cause:** TanStack Query's `isLoading` becomes `false` on *either* success or failure — every page in this codebase treated "not loading" as synonymous with "loaded successfully," which is only true on the happy path.

**Fix:** Added a shared `QueryError` component (message + Retry button that calls `refetch()`) and wired it as the first branch checked, before the loading/empty checks, in: `allergens.tsx`, `delivery-slots.tsx`, `zones.tsx`, `promo-codes.tsx`, `admins.tsx`, `plans.tsx`, `customers.tsx`, `customer-detail.tsx`, `menu-control.tsx`, `dashboard.tsx`, `reports.tsx`.

**Verified live** (not just built): patched `fetch` in a real browser session against the live production admin panel, confirmed the Allergens page now shows "Couldn't load this — check your connection and try again." with a Retry button instead of the false empty state, then confirmed a subsequent normal page load recovers fully with real data.

**Remaining:** `menu-weeks.tsx` (Q-06) was not touched — it's an 851-line weekly-menu composer I have not fully mapped, and I did not want to make a rushed edit to unfamiliar, complex state-management logic under time pressure. It should get the same treatment in a follow-up pass.

**Affected files:** 10 files listed above, plus the new `olivepinch/admin/src/components/query-error.tsx`.

---

### Q-03 — Four admin forms had zero double-submit protection (Medium, fixed)

**Reproduction:** Open the "New Allergen" (or Delivery Slot / Zone / Promo Code) modal, fill it in, click Save rapidly twice.

**Expected behavior:** One row created; the button visibly disables while saving (matching `menu-control.tsx` and `admins.tsx`, which already did this correctly).

**Actual behavior (before fix):** `allergens.tsx`, `delivery-slots.tsx`, `zones.tsx`, and `promo-codes.tsx` had no `saving` state at all — the submit button remained clickable and showed no feedback for the entire duration of the network request.

**Root cause:** These four pages were written by copying an earlier pattern that predated the `saving`-state convention established in `menu-control.tsx`/`admins.tsx`, and the convention was never backfilled.

**Fix:** Added `const [saving, setSaving] = useState(false)`, set it around the try/finally of each submit handler, and disabled the submit button (with "Saving..." label) while true — matching the existing convention exactly.

**Affected files:** `allergens.tsx`, `delivery-slots.tsx`, `zones.tsx`, `promo-codes.tsx`.

---

### Q-04 — Deleting a used menu item threw an unhandled 500 (Medium, fixed)

**Reproduction:** In Menu Control, attempt to delete any menu item that has ever been included in a customer's order (i.e., almost any item, since `Order`/`OrderItem` rows are created for the entire plan duration at subscription-creation time, not incrementally).

**Expected behavior:** A clear message explaining the item can't be deleted because it's in use.

**Actual behavior (before fix):** `prisma.menuItem.delete()` throws a Prisma `P2003` foreign-key-violation error (uncaught), which the global error handler turns into a generic `"Internal server error"` — accurate but unhelpful; the admin has no idea *why* the delete failed or what to do instead.

**Root cause:** `OrderItem.menuItemId` is a required relation with no `onDelete` action specified, so Postgres's default (`Restrict`) correctly blocks the delete — but nothing in the route catches that specific, entirely expected case.

**Fix:** Catch `Prisma.PrismaClientKnownRequestError` with code `P2003` and return `409 { error: "This item has already been used in orders and can't be deleted." }`.

**Affected files:** `server/src/routes/admin/menu-items.ts`.

**Recommendation not implemented:** `MenuItem` has no soft-delete/`active` flag the way `Allergen` and `DeliveryTimeSlot` do — adding one would let admins actually retire a used item from future selection instead of just being told they can't delete it. Worth doing in a future pass; out of scope for a minimal fix here.

---

### Q-05 — Customer app silently swallows fetch failures (Medium, documented, not fixed)

`useAllergens()` and `useDeliveryTimeSlots()` (`olivepinch-ui-change/src/lib/allergens.ts`, `delivery-time-slots.ts`) both do `api.get(...).then(setX).catch(() => {})` — an empty catch block. If the request fails, the hook silently returns an empty array forever, with no error state, no retry, and no way for the calling page to know something went wrong. On the signup `preferences.tsx` page, this would render zero allergen checkboxes with no explanation.

**Why not fixed in this pass:** the customer app doesn't use TanStack Query at all (confirmed via `grep -rn "isError"` returning zero results app-wide) — it's a hand-rolled `useEffect`/`useState` pattern throughout. Fixing this properly means either introducing a real error-state convention across the customer app (a bigger, cross-cutting decision) or a narrower fix to just these two hooks. Given this session already made two changes to the live checkout-adjacent code path (Q-01), I chose not to add a third change to the same area without a full survey of every other hook using this pattern first.

**Recommendation:** audit every `.catch(() => {})` in `olivepinch-ui-change/src/lib/` (a quick `grep -rn "catch(() => {})"` would find them all) and decide on one consistent error-surfacing pattern for the customer app.

---

## Fixed Issues (summary)

1. Checkout/renewal double-click race (Q-01) — `subscribe/delivery.tsx`, `dashboard/subscription.tsx`.
2. Admin panel false-empty-state-on-error, 10 pages (Q-02) — new `components/query-error.tsx`, wired into `allergens.tsx`, `delivery-slots.tsx`, `zones.tsx`, `promo-codes.tsx`, `admins.tsx`, `plans.tsx`, `customers.tsx`, `customer-detail.tsx`, `menu-control.tsx`, `dashboard.tsx`, `reports.tsx`.
3. Missing double-submit guards, 4 admin forms (Q-03) — `allergens.tsx`, `delivery-slots.tsx`, `zones.tsx`, `promo-codes.tsx`.
4. Unhandled menu-item-delete error (Q-04) — `server/src/routes/admin/menu-items.ts`.

All four verified via `tsc --noEmit` + production build in every affected repo; Q-02's core fix additionally verified live against the deployed admin panel by simulating a real fetch failure and confirming both the error state and full recovery.

## Remaining Issues

- Q-05: customer-app silent fetch failures (allergens, delivery slots, likely others).
- Q-06: `menu-weeks.tsx` not audited for the Q-02 pattern.
- Q-07: computed-field sort loads full table (pre-existing, self-acknowledged, low urgency at current scale).
- Q-08: TypeScript `strict` mode off in both frontends.
- Q-09: zero test coverage anywhere.
- Q-10: no code-splitting, both frontend bundles exceed the 500KB warning threshold.
- Q-11: no backend-level idempotency key on subscription/payment creation (frontend-only protection from Q-01).

---

## Best-Practice Recommendations

### Required before production
*(Nothing — the pilot is already live and nothing found in this pass is a "stop the pilot" issue. The two prior audits already closed the items that would have belonged here.)*

### Strongly recommended
- Apply the Q-02 fix to `menu-weeks.tsx`.
- Fix Q-05 (customer-app silent fetch failures) — pick one error-surfacing convention and apply it to every `useEffect`-based data hook.
- Introduce a test framework (Vitest fits naturally alongside the existing `tsx` tooling) and add regression tests for: the payment confirm/intent idempotency logic, the discount rounding fix, and the signup-token authorization check — the three highest-value fixes across all audits this session, currently protected only by one-off scripts.
- Add a soft-delete/`active` flag to `MenuItem` so Q-04's fix has a real alternative action to point admins toward, not just an explanation.

### Nice to have
- Enable `"strict": true` in both frontend `tsconfig.app.json` files and fix whatever surfaces (likely little, given zero `any` usage today).
- Code-split both frontend bundles (route-based `React.lazy` is the natural fit given `react-router-dom` is already in use).
- Add a backend-level idempotency key to `POST /subscriptions` for defense-in-depth against a deliberate (not just accidental) duplicate request.

---

## Test Coverage Gaps

Given zero tests exist anywhere, every area is technically a gap — ranked by actual business risk:

1. **Payment lifecycle** (`payments.ts`'s `confirmPayment`, the idempotency/status-transition guards from `PAYMENT_SECURITY_AUDIT.md`) — highest risk, currently protected only by direct code tracing.
2. **Discount/pricing math** (`promo.ts`'s `applyDiscount`) — the exact rounding bug fixed in the payment audit; a regression here silently under/over-charges customers.
3. **The signup-token authorization check** (`requireSignupToken`, from `SECURITY_AUDIT.md` OP-01) — the highest-severity fix in this whole session; currently has no committed test at all.
4. **Admin CRUD happy paths** — untested but lower risk, since these are behind admin auth and any breakage is immediately visible to a trusted user, not a silent customer-facing failure.
5. **The query-error pattern from this audit (Q-02)** — a snapshot/component test for `QueryError` and one representative page would catch a future regression back to the old silent-empty-state pattern.

---

## Coverage — what this audit did **not** test

Being explicit per this audit's own ground rules — do not claim something is tested unless it actually was:

- **No mobile-responsiveness testing** — no viewport resizing or touch-interaction testing was performed on either frontend.
- **No accessibility/keyboard-navigation testing** — no screen-reader, tab-order, or focus-management testing was performed.
- **No multi-session/concurrent-admin testing** — two admins editing the same record simultaneously was reasoned about from the code, not actually reproduced with two live sessions.
- **No real load/concurrency testing at the database level** — Q-01's fix addresses the realistic browser-driven double-click case; a genuinely concurrent pair of raw API requests bypassing the frontend entirely was not tested against a live database (see Q-11).
- **No Firebase failure-mode testing** (expired OTP, Firebase outage, token refresh edge cases) — reasoned about from the code (`verifyFirebaseUser`'s error handling), not reproduced against a real degraded Firebase state.
- **No slow-network/timeout simulation** beyond the `fetch`-rejection test used to verify Q-02 — genuine network throttling, partial responses, or mid-request disconnects were not tested.
- **`menu-weeks.tsx`** was read only enough to confirm its size and general query pattern — not functionally tested at all (see Q-06).
- **The customer-app signup funnel beyond the checkout/renewal buttons** (Q-01) was not re-tested end-to-end in a live browser session in this pass — it was verified earlier in this session (allergens/preferences flow) before Q-01's fix was added; the fix itself was verified by code tracing and build, not a fresh live click-through.
