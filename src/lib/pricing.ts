import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { GOAL_TO_ENUM, TIER_TO_ENUM } from "@/lib/enum-map"
import type { Goal } from "@/data/menu"
import type { PlanTier } from "@/lib/subscribe-context"

export interface Plan {
  id: string
  planDuration: 7 | 14 | 28
  goal: string // backend enum value, e.g. "WEIGHT_LOSS"
  tier: string // backend enum value, "BASIC" | "ADVANCED"
  price: string
  active: boolean
}

// Price is plan-based, goal-based and tier-based — a flat rate admin sets per (days, goal,
// tier) combination (see the admin "Plans" page), not a sum of the day's actual menu items.
export function usePlans(): Plan[] {
  const [plans, setPlans] = useState<Plan[]>([])
  useEffect(() => {
    api.get<Plan[]>("/plans").then(setPlans).catch(() => {})
  }, [])
  return plans
}

export function priceFor(plans: Plan[], goal: Goal | null, planDuration: number, tier: PlanTier | null = "Basic"): number | null {
  if (!goal) return null
  const enumGoal = GOAL_TO_ENUM[goal]
  const enumTier = TIER_TO_ENUM[tier ?? "Basic"]
  const plan = plans.find((p) => p.goal === enumGoal && p.planDuration === planDuration && p.tier === enumTier)
  return plan ? Number(plan.price) : null
}

export function formatGBP(amount: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount)
}
