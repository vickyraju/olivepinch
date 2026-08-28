// Run: npx tsx src/lib/email-templates.test.ts (also worth running under TZ=America/Los_Angeles,
// which is where a non-Europe/London formatter would slip the date back a day).
import assert from "node:assert/strict"
import { formatDate } from "./email-templates.js"
import { canPauseDate, londonToday, londonInstant, addDays } from "./subscription.js"
import { fridayCutoffFor, publishEditLockFor } from "./menu-week.js"

// --- date display ---
assert.equal(formatDate("2026-03-14"), "Sat 14 Mar 2026") // GMT (before the BST switchover)
assert.equal(formatDate("2026-07-14"), "Tue 14 Jul 2026") // BST — still the same day, not rolled forward
assert.equal(formatDate("2026-01-01"), "Thu 1 Jan 2026") // no zero-padded day, no comma
assert.equal(formatDate("not-a-date"), "not-a-date") // a customer never sees "Invalid Date"

// --- "today" in UK terms ---
// 23:30 UTC on a BST night is already the next day in London; in winter it isn't.
assert.equal(londonToday(new Date("2026-07-17T23:30:00Z")).toISOString().slice(0, 10), "2026-07-18")
assert.equal(londonToday(new Date("2026-01-17T23:30:00Z")).toISOString().slice(0, 10), "2026-01-17")

// --- pause cutoff: 12:30pm UK the day before delivery ---
const winterDelivery = new Date("2026-03-14T00:00:00Z") // GMT: 12:30 UK == 12:30 UTC
assert.equal(canPauseDate(winterDelivery, new Date("2026-03-13T12:29:00Z")), true)
assert.equal(canPauseDate(winterDelivery, new Date("2026-03-13T12:31:00Z")), false)
const summerDelivery = new Date("2026-07-18T00:00:00Z") // BST: 12:30 UK == 11:30 UTC
assert.equal(canPauseDate(summerDelivery, new Date("2026-07-17T11:29:00Z")), true)
assert.equal(canPauseDate(summerDelivery, new Date("2026-07-17T11:31:00Z")), false)

// --- menu-week windows: Saturday/Wednesday 00:00 UK, not 00:00 UTC ---
// BST week: London midnight is 23:00 UTC the evening before.
const summerWeek = new Date("2026-07-20T00:00:00Z") // a Monday
assert.equal(fridayCutoffFor(summerWeek).toISOString(), "2026-07-17T23:00:00.000Z")
assert.equal(publishEditLockFor(summerWeek).toISOString(), "2026-07-14T23:00:00.000Z")
// GMT week: London midnight is 00:00 UTC, so the two coincide.
const winterWeek = new Date("2026-01-19T00:00:00Z") // a Monday
assert.equal(fridayCutoffFor(winterWeek).toISOString(), "2026-01-17T00:00:00.000Z")

// The cutoff is Saturday 00:00, so the last day a customer can actually choose is the Friday —
// which is what the email shows them.
assert.equal(addDays(winterWeek, -3).toISOString().slice(0, 10), "2026-01-16")
assert.equal(formatDate(addDays(winterWeek, -3).toISOString().slice(0, 10)), "Fri 16 Jan 2026")

// londonInstant sanity: noon UK is 11:00 UTC in summer, 12:00 UTC in winter.
assert.equal(londonInstant(new Date("2026-07-01T00:00:00Z"), 12).toISOString(), "2026-07-01T11:00:00.000Z")
assert.equal(londonInstant(new Date("2026-01-01T00:00:00Z"), 12).toISOString(), "2026-01-01T12:00:00.000Z")

console.log("email-templates + uk time: ok")
