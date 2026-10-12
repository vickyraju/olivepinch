// Run: npx tsx src/lib/renewal-start.test.ts
import assert from "node:assert/strict"
import { renewalStartDate } from "./subscription.js"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const iso = (date: Date) => date.toISOString().slice(0, 10)

// 2026-10-12 is a Monday.
// First plan / nothing to follow: today + 2 (Monday -> Wednesday).
assert.equal(iso(renewalStartDate(d("2026-10-12"), null)), "2026-10-14")
// Renewed on the last day of the plan (ends today, Monday): Wednesday, not on top of Monday's delivery.
assert.equal(iso(renewalStartDate(d("2026-10-12"), d("2026-10-12"))), "2026-10-14")
// Plan ended days ago: still the lead time from today.
assert.equal(iso(renewalStartDate(d("2026-10-12"), d("2026-10-05"))), "2026-10-14")
// Plan ends tomorrow: the day after it ends (Wednesday) already satisfies the lead time.
assert.equal(iso(renewalStartDate(d("2026-10-12"), d("2026-10-13"))), "2026-10-14")
// Renewed early, plan ends Saturday: carry on from Sunday, no overlap.
assert.equal(iso(renewalStartDate(d("2026-10-12"), d("2026-10-17"))), "2026-10-18")
// Month boundary: renewed Sat 31 Oct on last day -> Mon 2 Nov.
assert.equal(iso(renewalStartDate(d("2026-10-31"), d("2026-10-31"))), "2026-11-02")

console.log("renewal-start.test.ts passed")
