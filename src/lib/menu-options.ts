import type { PublishedMenuItem } from "@/types/menu"

export type MenuOption = PublishedMenuItem & { outsideFoodTypes?: boolean }

// The dishes a customer may pick for one box: their tier only, never anything with an allergen they avoid.
// Dishes matching their food types are offered; if a box has none that day, the other dishes of their tier
// are offered instead (marked), so nobody is ever left with an empty box and nothing reaches the kitchen.
export function optionsForBox(candidates: PublishedMenuItem[], tier: string, dietEnums: Set<string>, avoided: Set<string>): MenuOption[] {
  const safe = candidates.filter((item) => item.tier === tier && !item.allergenTags.some((a) => avoided.has(a)))
  const matching = safe.filter((item) => item.dietTags.some((tag) => dietEnums.has(tag)))
  if (matching.length > 0) return matching
  return safe.map((item) => ({ ...item, outsideFoodTypes: true }))
}
