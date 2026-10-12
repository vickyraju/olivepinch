// Rules for an admin setting the meals on specific upcoming days of a subscription. Pure (no DB) so
// the safety rules can be tested directly. Unlike the customer's weekly pick, an admin isn't limited
// to the published menu or the Friday cutoff, but a meal must still fit the box it goes in, the day
// must still be changeable, and a meal containing an allergen the customer avoids is never allowed.

export interface DayMealOrder {
  id: string
  date: string // YYYY-MM-DD
  status: string
}

export interface DayMealItem {
  id: string
  name: string
  slot: string
  allergenTags: string[]
  dietTags: string[]
}

export interface DayMealInput {
  date: string
  items: string[] // menu item ids, positionally matched to the plan's boxes
}

export interface DayMealCustomer {
  allergens: string[]
  dietTypes: string[]
}

// Only these can still change: the kitchen has already prepared or sent anything else.
const EDITABLE_STATUSES = ["SCHEDULED", "PAUSED"]

export function checkDayMeals(args: {
  slots: string[] // boxes for this plan, e.g. ["BREAKFAST", "DINNER"]
  orders: DayMealOrder[]
  customer: DayMealCustomer
  menuItems: Map<string, DayMealItem>
  dayItems: DayMealInput[]
  today: string // YYYY-MM-DD, London
}) {
  const { slots, orders, customer, menuItems, dayItems, today } = args
  const errors: string[] = []
  const warnings: string[] = []
  const updates: { orderId: string; date: string; items: { menuItemId: string; slot: string }[] }[] = []
  const ordersByDate = new Map(orders.map((o) => [o.date, o]))
  const avoided = new Set(customer.allergens.map((a) => a.trim().toLowerCase()))
  const seen = new Set<string>()

  for (const day of dayItems) {
    if (seen.has(day.date)) {
      errors.push(`${day.date}: listed more than once.`)
      continue
    }
    seen.add(day.date)

    const order = ordersByDate.get(day.date)
    if (!order) {
      errors.push(`${day.date}: this plan has no delivery on that day.`)
      continue
    }
    if (day.date <= today) {
      errors.push(`${day.date}: that delivery is today or already past, so it can't be changed.`)
      continue
    }
    if (!EDITABLE_STATUSES.includes(order.status)) {
      errors.push(`${day.date}: that delivery is already ${order.status.toLowerCase().replace(/_/g, " ")}, so it can't be changed.`)
      continue
    }
    if (day.items.length !== slots.length) {
      errors.push(`${day.date}: choose a meal for each of the ${slots.length} boxes.`)
      continue
    }

    const resolved: { menuItemId: string; slot: string }[] = []
    let dayOk = true
    day.items.forEach((id, i) => {
      const item = menuItems.get(id)
      if (!item) {
        errors.push(`${day.date}: that meal doesn't exist any more.`)
        dayOk = false
        return
      }
      if (item.slot !== slots[i]) {
        errors.push(`${day.date}: "${item.name}" is a ${item.slot.toLowerCase()} meal and can't go in that box.`)
        dayOk = false
        return
      }
      const clash = item.allergenTags.filter((a) => avoided.has(a.trim().toLowerCase()))
      if (clash.length > 0) {
        errors.push(`${day.date}: "${item.name}" contains ${clash.join(", ")}, which this customer avoids.`)
        dayOk = false
        return
      }
      if (customer.dietTypes.length > 0 && !item.dietTags.some((d) => customer.dietTypes.includes(d))) {
        warnings.push(`${day.date}: "${item.name}" isn't in this customer's usual food types.`)
      }
      resolved.push({ menuItemId: item.id, slot: item.slot })
    })
    if (dayOk) updates.push({ orderId: order.id, date: day.date, items: resolved })
  }

  if (dayItems.length === 0) errors.push("Choose at least one day to change.")
  return { errors, warnings, updates }
}
