// Run: npx tsx src/lib/email-templates.test.ts (also worth running under TZ=America/Los_Angeles,
// which is where a non-Europe/London formatter would slip the date back a day).
import assert from "node:assert/strict"
import { formatDate } from "./email-templates.js"

assert.equal(formatDate("2026-03-14"), "Sat 14 Mar 2026") // GMT (before the BST switchover)
assert.equal(formatDate("2026-07-14"), "Tue 14 Jul 2026") // BST — still the same day, not rolled forward
assert.equal(formatDate("2026-01-01"), "Thu 1 Jan 2026") // no zero-padded day, no comma
assert.equal(formatDate("not-a-date"), "not-a-date") // a customer never sees "Invalid Date"

console.log("email-templates: ok")
