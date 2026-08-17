import { prisma } from "./prisma.js"
import type { DietType, Goal, MealSlot } from "@prisma/client"

export const SLOTS_BY_MEALS_PER_DAY: Record<1 | 2 | 3, MealSlot[]> = {
  1: ["LUNCH"],
  2: ["BREAKFAST", "DINNER"],
  3: ["BREAKFAST", "LUNCH", "DINNER"],
}

export async function defaultMenuItemFor(goal: Goal, dietTypes: DietType[], allergens: string[], slot: MealSlot) {
  const candidates = await prisma.menuItem.findMany({
    where: { slot, dietTags: { hasSome: dietTypes } },
  })
  const excluded = new Set(allergens)
  const pool = candidates.filter((item) => !item.allergenTags.some((a) => excluded.has(a)))
  const goalMatch = pool.find((item) => item.goalTags.includes(goal))
  const chosen = goalMatch ?? pool[0]
  if (!chosen) throw new Error(`No menu item available for slot ${slot} matching diet ${dietTypes.join(", ")}`)
  return chosen
}

export async function estimatePrice(params: {
  goal: Goal
  dietTypes: DietType[]
  allergens: string[]
  mealsPerDay: 1 | 2 | 3
  planDuration: number
}) {
  const slots = SLOTS_BY_MEALS_PER_DAY[params.mealsPerDay]
  const items = await Promise.all(
    slots.map((slot) => defaultMenuItemFor(params.goal, params.dietTypes, params.allergens, slot))
  )
  const perDay = items.reduce((sum, item) => sum + Number(item.price), 0)
  return { perDay, total: perDay * params.planDuration, items }
}
