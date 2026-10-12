// Run: npx tsx src/lib/renewals.test.ts
import assert from "node:assert/strict"
import { renewalsFor, lastRenewedAt, type RenewalSubscription, type RenewalPayment } from "./renewals.js"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const sub = (id: string, created: string, start: string, planDuration = 14, extra: Partial<RenewalSubscription> = {}): RenewalSubscription => ({
  id, createdAt: d(created), startDate: d(start), planDuration, mealsPerDay: 2, tier: "BASIC", pausedDates: [], discountAmount: 0, ...extra,
})
const pay = (subscriptionId: string, paidAt: string, amount = 100, status = "succeeded"): RenewalPayment => ({ subscriptionId, status, paidAt: d(paidAt), amount })

// Never renewed: nothing, and no first-purchase false positive.
assert.deepEqual(renewalsFor([], []), [])
assert.deepEqual(renewalsFor([sub("a", "2026-09-01", "2026-09-03")], [pay("a", "2026-09-01")]), [])
assert.equal(lastRenewedAt([]), null)

// Abandoned renewal (pending, never paid) is ignored.
assert.deepEqual(
  renewalsFor([sub("a", "2026-09-01", "2026-09-03"), sub("b", "2026-09-14", "2026-09-14")], [pay("a", "2026-09-01")]),
  []
)
// Failed payment doesn't count either.
assert.deepEqual(
  renewalsFor([sub("a", "2026-09-01", "2026-09-03"), sub("b", "2026-09-14", "2026-09-14")], [pay("a", "2026-09-01"), pay("b", "2026-09-14", 100, "failed")]),
  []
)

// Renewed before the previous plan ended: a (14 days from 3 Sep) ends 16 Sep; renewal paid 13 Sep = 3 days early.
{
  const [r] = renewalsFor(
    [sub("a", "2026-09-01", "2026-09-03"), sub("b", "2026-09-13", "2026-09-13", 28, { tier: "ADVANCED", discountAmount: "10.00" })],
    [pay("a", "2026-09-01"), pay("b", "2026-09-13", 90)]
  )!
  assert.equal(r.subscriptionId, "b")
  assert.equal(r.daysBeforePreviousEnd, 3)
  assert.deepEqual(r.previous, { planDuration: 14, tier: "BASIC", mealsPerDay: 2 })
  assert.deepEqual(r.current, { planDuration: 28, tier: "ADVANCED", mealsPerDay: 2 })
  assert.equal(r.amountPaid, 90)
  assert.equal(r.discountAmount, 10)
  assert.equal(r.renewedAt.toISOString().slice(0, 10), "2026-09-13")
}

// Renewed after it lapsed: previous ended 16 Sep, renewed 20 Sep = 4 days after.
assert.equal(
  renewalsFor([sub("a", "2026-09-01", "2026-09-03"), sub("b", "2026-09-20", "2026-09-20")], [pay("a", "2026-09-01"), pay("b", "2026-09-20")])[0]!.daysBeforePreviousEnd,
  -4
)
// Paused days push the previous plan's end out: one pause makes it end 17 Sep, so 16 Sep is 1 day before.
assert.equal(
  renewalsFor(
    [sub("a", "2026-09-01", "2026-09-03", 14, { pausedDates: [d("2026-09-08")] }), sub("b", "2026-09-16", "2026-09-16")],
    [pay("a", "2026-09-01"), pay("b", "2026-09-16")]
  )[0]!.daysBeforePreviousEnd,
  1
)

// Two renewals, newest first; previous plan is the one before it, skipping an abandoned attempt between.
{
  const out = renewalsFor(
    [sub("a", "2026-08-01", "2026-08-03"), sub("b", "2026-08-15", "2026-08-17"), sub("x", "2026-09-01", "2026-09-01"), sub("c", "2026-09-10", "2026-09-10", 7)],
    [pay("a", "2026-08-01"), pay("b", "2026-08-15"), pay("c", "2026-09-10")]
  )
  assert.deepEqual(out.map((r) => r.subscriptionId), ["c", "b"])
  assert.equal(out[0]!.previous.planDuration, 14)
  assert.equal(lastRenewedAt(out)!.toISOString().slice(0, 10), "2026-09-10")
}

console.log("renewals.test.ts passed")
