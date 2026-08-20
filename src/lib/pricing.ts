import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { GOAL_TO_ENUM } from "@/lib/enum-map"
import type { Goal } from "@/data/menu"

export interface Plan {
  id: string
  planDuration: 7 | 14 | 28
  goal: string // backend enum value, e.g. "WEIGHT_LOSS"
  price: string
  active: boolean
}

// Price is plan-based and goal-based — a flat rate admin sets per (days, goal) combination
// (see the admin "Plans" page), not a sum of the day's actual menu items.
export function usePlans(): Plan[] {
  const [plans, setPlans] = useState<Plan[]>([])
  useEffect(() => {
    api.get<Plan[]>("/plans").then(setPlans).catch(() => {})
  }, [])
  return plans
}

export function priceFor(plans: Plan[], goal: Goal | null, planDuration: number): number | null {
  if (!goal) return null
  const enumGoal = GOAL_TO_ENUM[goal]
  const plan = plans.find((p) => p.goal === enumGoal && p.planDuration === planDuration)
  return plan ? Number(plan.price) : null
}

export function formatGBP(amount: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount)
}
