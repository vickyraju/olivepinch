import { prisma } from "./prisma.js"
import type { Goal, MealSlot, PlanTier } from "@prisma/client"

export const SLOTS_BY_MEALS_PER_DAY: Record<1 | 2 | 3, MealSlot[]> = {
  1: ["LUNCH"],
  2: ["BREAKFAST", "DINNER"],
  3: ["BREAKFAST", "LUNCH", "DINNER"],
}

// Price is plan-based, goal-based, tier-based and meals-based — a flat rate admin sets per
// (days, goal, tier, mealsPerDay) combination (see the Plan model), not a sum of the day's
// actual menu items.
export async function planPrice(goal: Goal, planDuration: number, tier: PlanTier = "BASIC", mealsPerDay: 1 | 2 | 3 = 2): Promise<number> {
  const plan = await prisma.plan.findUnique({
    where: { planDuration_goal_tier_mealsPerDay: { planDuration, goal, tier, mealsPerDay } },
  })
  if (!plan) {
    throw Object.assign(new Error(`No plan configured for ${planDuration} days / ${goal} / ${tier} / ${mealsPerDay} meals`), { status: 400 })
  }
  return Number(plan.price)
}
