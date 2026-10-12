// Run: npx tsx src/lib/day-meals.test.ts
import assert from "node:assert/strict"
import { checkDayMeals, type DayMealItem } from "./day-meals.js"

const item = (id: string, name: string, slot: string, allergenTags: string[] = [], dietTags = ["MEAT"]): DayMealItem => ({ id, name, slot, allergenTags, dietTags })
const menu = new Map<string, DayMealItem>([
  ["b1", item("b1", "Oats", "BREAKFAST", ["Gluten"], ["VEGAN", "VEGETARIAN"])],
  ["b2", item("b2", "Egg Wrap", "BREAKFAST", ["Eggs"])],
  ["d1", item("d1", "Cod", "DINNER", ["Fish"], ["FISH"])],
  ["d2", item("d2", "Chicken", "DINNER")],
  ["l1", item("l1", "Bowl", "LUNCH")],
])
const base = {
  slots: ["BREAKFAST", "DINNER"],
  orders: [
    { id: "o1", date: "2026-10-14", status: "SCHEDULED" },
    { id: "o2", date: "2026-10-15", status: "PAUSED" },
    { id: "o3", date: "2026-10-16", status: "SCHEDULED" },
    { id: "o0", date: "2026-10-12", status: "DELIVERED" },
    { id: "o9", date: "2026-10-13", status: "OUT_FOR_DELIVERY" },
  ],
  customer: { allergens: ["gluten"], dietTypes: ["MEAT"] },
  menuItems: menu,
  today: "2026-10-12",
}

// Valid change on two days (one paused day is still editable).
{
  const r = checkDayMeals({ ...base, dayItems: [{ date: "2026-10-14", items: ["b2", "d2"] }, { date: "2026-10-15", items: ["b2", "d2"] }] })
  assert.deepEqual(r.errors, [])
  assert.deepEqual(r.updates.map((u) => u.orderId), ["o1", "o2"])
  assert.deepEqual(r.updates[0]!.items, [{ menuItemId: "b2", slot: "BREAKFAST" }, { menuItemId: "d2", slot: "DINNER" }])
}
// Allergen clash is a hard error (case-insensitive: customer "gluten" vs item "Gluten").
assert.match(checkDayMeals({ ...base, dayItems: [{ date: "2026-10-14", items: ["b1", "d2"] }] }).errors[0]!, /contains Gluten/)
// Wrong box, unknown meal, wrong count.
assert.match(checkDayMeals({ ...base, dayItems: [{ date: "2026-10-14", items: ["l1", "d2"] }] }).errors[0]!, /can't go in that box/)
assert.match(checkDayMeals({ ...base, dayItems: [{ date: "2026-10-14", items: ["nope", "d2"] }] }).errors[0]!, /doesn't exist/)
assert.match(checkDayMeals({ ...base, dayItems: [{ date: "2026-10-14", items: ["b2"] }] }).errors[0]!, /each of the 2 boxes/)
// Days that can't change: not on the plan, today, past, already out for delivery / delivered.
assert.match(checkDayMeals({ ...base, dayItems: [{ date: "2026-10-20", items: ["b2", "d2"] }] }).errors[0]!, /no delivery on that day/)
assert.match(checkDayMeals({ ...base, dayItems: [{ date: "2026-10-12", items: ["b2", "d2"] }] }).errors[0]!, /today or already past/)
assert.match(checkDayMeals({ ...base, dayItems: [{ date: "2026-10-13", items: ["b2", "d2"] }], today: "2026-10-12" }).errors[0]!, /out for delivery|already/)
assert.match(checkDayMeals({ ...base, orders: [{ id: "x", date: "2026-10-17", status: "DELIVERED" }], dayItems: [{ date: "2026-10-17", items: ["b2", "d2"] }] }).errors[0]!, /already delivered/)
// Duplicate date and empty request.
assert.match(checkDayMeals({ ...base, dayItems: [{ date: "2026-10-14", items: ["b2", "d2"] }, { date: "2026-10-14", items: ["b2", "d2"] }] }).errors[0]!, /more than once/)
assert.deepEqual(checkDayMeals({ ...base, dayItems: [] }).errors, ["Choose at least one day to change."])
// Diet mismatch is a warning, not a block: customer eats MEAT, "Cod" is FISH only.
{
  const r = checkDayMeals({ ...base, dayItems: [{ date: "2026-10-14", items: ["b2", "d1"] }] })
  assert.deepEqual(r.errors, [])
  assert.equal(r.updates.length, 1)
  assert.match(r.warnings[0]!, /isn't in this customer's usual food types/)
}
// One bad day doesn't block the good one from being reported, but nothing partial is returned for the bad day.
{
  const r = checkDayMeals({ ...base, dayItems: [{ date: "2026-10-14", items: ["b2", "d2"] }, { date: "2026-10-16", items: ["b1", "d2"] }] })
  assert.equal(r.errors.length, 1)
  assert.deepEqual(r.updates.map((u) => u.date), ["2026-10-14"])
}
console.log("day-meals.test.ts passed")
