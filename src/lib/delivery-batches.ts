import type { OrderDay } from "@/lib/dashboard-context"
import type { DeliverySlot } from "@/lib/subscribe-context"
import { toDateKey } from "@/lib/subscription"

function mondayOf(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`)
  const day = d.getUTCDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return toDateKey(d)
}

/** Groups a customer's upcoming per-day orders into physical drop-offs based on their chosen
 * delivery slot. Order/OrderItem stay per-day underneath — this is a display-only grouping,
 * so pause/resume keeps working exactly the same on each day inside a batch. */
export function groupIntoBatches(orders: OrderDay[], deliverySlot: DeliverySlot): OrderDay[][] {
  if (deliverySlot === "Daily") return orders.map((o) => [o])

  if (deliverySlot === "Weekly") {
    const byWeek = new Map<string, OrderDay[]>()
    for (const order of orders) {
      const key = mondayOf(order.date)
      const group = byWeek.get(key)
      if (group) group.push(order)
      else byWeek.set(key, [order])
    }
    return [...byWeek.values()]
  }

  // Alternate days: pair up consecutive orders in delivery order, trailing single if odd.
  const batches: OrderDay[][] = []
  for (let i = 0; i < orders.length; i += 2) {
    batches.push(orders.slice(i, i + 2))
  }
  return batches
}
