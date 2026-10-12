// Run: npx tsx src/lib/current-subscription.test.ts
import assert from "node:assert/strict"
import { pickSubscriptions } from "./subscription.js"

const sub = (id: string, status: string, created: string) => ({ id, status, createdAt: new Date(`${created}T10:00:00Z`) })
const ids = (r: ReturnType<typeof pickSubscriptions>) => r && { current: r.current.id, pending: r.pendingRenewal?.id ?? null, earlier: r.earlier?.id ?? null }

// Nothing at all.
assert.equal(pickSubscriptions([]), null)
// First signup that hasn't paid yet: the pending one is all there is, so it is the current one.
assert.deepEqual(ids(pickSubscriptions([sub("p", "PENDING_PAYMENT", "2026-10-01")])), { current: "p", pending: null, earlier: null })
// One paid plan.
assert.deepEqual(ids(pickSubscriptions([sub("a", "ACTIVE", "2026-10-01")])), { current: "a", pending: null, earlier: null })
// Abandoned renewal (newest, unpaid) must not hide the active plan; it is exposed as the in-progress renewal.
assert.deepEqual(ids(pickSubscriptions([sub("r", "PENDING_PAYMENT", "2026-10-10"), sub("a", "ACTIVE", "2026-10-01")])), { current: "a", pending: "r", earlier: null })
// An old abandoned attempt (older than the active plan) is not a renewal in progress.
assert.deepEqual(ids(pickSubscriptions([sub("a", "ACTIVE", "2026-10-06"), sub("old", "PENDING_PAYMENT", "2026-10-05")])), { current: "a", pending: null, earlier: null })
// Early renewal, now paid: new plan current, previous still active is "earlier".
assert.deepEqual(ids(pickSubscriptions([sub("b", "ACTIVE", "2026-10-11"), sub("a", "ACTIVE", "2026-10-06")])), { current: "b", pending: null, earlier: "a" })
// Expired plan with a renewal in progress: still shows the expired plan, with the renewal to confirm.
assert.deepEqual(ids(pickSubscriptions([sub("r", "PENDING_PAYMENT", "2026-10-20"), sub("a", "EXPIRED", "2026-09-01")])), { current: "a", pending: "r", earlier: null })
// A cancelled newest plan is still the current one (not swapped for an older plan), and an expired plan is never "earlier".
assert.deepEqual(ids(pickSubscriptions([sub("c", "CANCELLED", "2026-10-11"), sub("a", "ACTIVE", "2026-10-01")])), { current: "c", pending: null, earlier: "a" })
assert.deepEqual(ids(pickSubscriptions([sub("b", "ACTIVE", "2026-10-11"), sub("a", "EXPIRED", "2026-10-01")])), { current: "b", pending: null, earlier: null })
// Several abandoned attempts: the newest is the one in progress.
assert.deepEqual(
  ids(pickSubscriptions([sub("r2", "PENDING_PAYMENT", "2026-10-12"), sub("r1", "PENDING_PAYMENT", "2026-10-11"), sub("a", "ACTIVE", "2026-10-01")])),
  { current: "a", pending: "r2", earlier: null }
)
console.log("current-subscription.test.ts passed")
