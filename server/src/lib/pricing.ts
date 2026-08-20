import { prisma } from "./prisma.js"
import type { DietType, Goal, MealSlot, PlanTier } from "@prisma/client"

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

// Price is plan-based, goal-based and tier-based — a flat rate admin sets per (days, goal,
// tier) combination (see the Plan model), not a sum of the day's actual menu items. The
// customer funnel doesn't offer tier selection yet, so checkout defaults to Basic.
export async function planPrice(goal: Goal, planDuration: number, tier: PlanTier = "BASIC"): Promise<number> {
  const plan = await prisma.plan.findUnique({ where: { planDuration_goal_tier: { planDuration, goal, tier } } })
  if (!plan) {
    throw Object.assign(new Error(`No plan configured for ${planDuration} days / ${goal} / ${tier}`), { status: 400 })
  }
  return Number(plan.price)
}
