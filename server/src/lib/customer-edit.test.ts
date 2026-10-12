// Run: npx tsx src/lib/customer-edit.test.ts
import assert from "node:assert/strict"
import { diffCustomerEdit, type CustomerLike } from "./customer-edit.js"

const base: CustomerLike = {
  fullName: "Ada Lovelace", email: "ada@example.com", phone: "+447000000001", gender: "Female",
  dateOfBirth: new Date("1990-04-02T00:00:00.000Z"), heightCm: 170, weightKg: 65, goal: "WEIGHT_LOSS",
  dietTypes: ["MEAT", "FISH"], allergens: ["Gluten"], addressDoorNumber: "10", addressBuildingName: null,
  addressStreet: "High St", addressArea: "Digbeth", addressPostcode: "B5 5AA", marketingOptIn: false, accountStatus: "ACTIVE",
}

// Nothing sent, or the same values sent: nothing changes (so no write and no audit entry).
assert.deepEqual(diffCustomerEdit(base, {}).changed, [])
assert.deepEqual(
  diffCustomerEdit(base, { fullName: " Ada Lovelace ", dietTypes: ["FISH", "MEAT"], allergens: ["Gluten"], dateOfBirth: "1990-04-02", phone: "+447000000001", addressBuildingName: "" }).changed,
  []
)

// A real change: only that field is written.
{
  const r = diffCustomerEdit(base, { fullName: "Ada King", heightCm: 171 })
  assert.deepEqual(r.changed, ["fullName", "heightCm"])
  assert.deepEqual(r.data, { fullName: "Ada King", heightCm: 171 })
  assert.equal(r.emailChanged, false)
  assert.equal(r.data.supabaseUserId, undefined)
}

// Email change detaches the login account so the new address can be linked on next login.
{
  const r = diffCustomerEdit(base, { email: "ada.new@example.com" })
  assert.equal(r.emailChanged, true)
  assert.equal(r.data.email, "ada.new@example.com")
  assert.equal(r.data.supabaseUserId, null)
}

// Clearing optional fields.
{
  const r = diffCustomerEdit(base, { phone: "", gender: null, dateOfBirth: null, heightCm: null })
  assert.deepEqual(r.data, { phone: null, gender: null, dateOfBirth: null, heightCm: null })
}

// Audit detail: low-sensitivity values shown, personal and health values never.
{
  const r = diffCustomerEdit(base, { goal: "MUSCLE_BUILDING", dietTypes: ["VEGAN"], allergens: ["Nuts"], weightKg: 99, phone: "+447999999999", marketingOptIn: true, accountStatus: "READ_ONLY" })
  assert.match(r.detail, /goal: WEIGHT_LOSS → MUSCLE_BUILDING/)
  assert.match(r.detail, /dietTypes: MEAT, FISH → VEGAN/)
  assert.match(r.detail, /marketingOptIn: false → true/)
  assert.match(r.detail, /accountStatus: ACTIVE → READ_ONLY/)
  for (const secret of ["99", "Nuts", "+447999999999", "Gluten"]) assert.equal(r.detail.includes(secret), false, `leaked ${secret}`)
  assert.match(r.detail, /allergens/)
  assert.match(r.detail, /weightKg/)
}

// Customer without a date of birth: setting one is a change.
assert.deepEqual(diffCustomerEdit({ ...base, dateOfBirth: null }, { dateOfBirth: "1990-04-02" }).changed, ["dateOfBirth"])

console.log("customer-edit.test.ts passed")
