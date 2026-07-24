import { MENU_ITEMS } from "@/data/menu"
import type { DayMenu } from "@/lib/subscribe-context"

const priceById = new Map(MENU_ITEMS.map((item) => [item.id, item.price]))

export function priceForDayMenus(dayMenus: DayMenu[]): number {
  let total = 0
  for (const day of dayMenus) {
    for (const itemId of day.items) {
      total += priceById.get(itemId) ?? 0
    }
  }
  return total
}

export function formatGBP(amount: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount)
}
