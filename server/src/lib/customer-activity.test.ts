import assert from "node:assert/strict"
import { describeChanges } from "./customer-activity.js"

const labels = { phone: "Phone", street: "Street", area: "Area" }
assert.equal(describeChanges(labels, { phone: "+44700", street: "A", area: "X" }, { phone: "+44700", street: "A", area: "X" }), "")
assert.equal(describeChanges(labels, { phone: "+44700", street: "A" }, { phone: "+44701", street: "A" }), "Phone: +44700 -> +44701")
assert.equal(describeChanges(labels, { street: "A" }, { street: "B", area: "Y" }), "Street: A -> B; Area: (empty) -> Y")
console.log("customer-activity ok")
