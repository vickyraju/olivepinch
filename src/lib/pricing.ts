import type { DayMenu } from "@/lib/subscribe-context"

export interface PriceEstimate {
  total: number
  /** True once any day beyond what's explicitly chosen falls back to a server-side default —
   * its exact item (and so its exact price) isn't known client-side, so the total is a
   * projection, not the confirmed figure the backend computes at checkout. */
  isEstimate: boolean
}

// Real prices only — driven by whatever MenuItem data the menu step actually fetched from
// published weeks (see SubscribeState.menuItemPrices), never the old hardcoded catalog.
// Days beyond what the customer explicitly chose (dayMenus.length < planDuration) fall back
// to a per-day average of known real prices; if nothing is known yet at all, there's nothing
// honest to show — the caller should render "confirmed at checkout" instead of a number.
export function estimateTotal(
  dayMenus: DayMenu[],
  menuItemPrices: Record<string, number>,
  planDuration: number,
  mealsPerDay: number
): PriceEstimate | null {
  const knownPrices = Object.values(menuItemPrices)
  const chosenTotal = dayMenus.reduce(
    (sum, day) => sum + day.items.reduce((s, itemId) => s + (menuItemPrices[itemId] ?? 0), 0),
    0
  )
  const missingDays = planDuration - dayMenus.length

  if (missingDays <= 0) {
    return { total: chosenTotal, isEstimate: false }
  }
  if (knownPrices.length === 0) {
    return null
  }
  const averageItemPrice = knownPrices.reduce((a, b) => a + b, 0) / knownPrices.length
  return { total: chosenTotal + missingDays * mealsPerDay * averageItemPrice, isEstimate: true }
}

export function formatGBP(amount: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount)
}
