import { prisma } from "./prisma.js"
import type { DiscountType, Goal, PlanTier, PromoCode } from "@prisma/client"

export function applyDiscount(base: number, type: DiscountType, value: number): number {
  if (type === "PERCENT") return Math.max(0, base * (1 - value / 100))
  return Math.max(0, base - value)
}

type ValidateContext = {
  goal: Goal
  tier: PlanTier
  planDuration: number
  customerId?: string
}

type ValidateResult = { promoCode: PromoCode; discountAmount: number } | { error: string }

// Authoritative check happens once customerId is known (subscription create/renew); the
// signup-time preview call (no customerId yet) can't check per-customer/first-subscription
// rules, so those are re-checked server-side at subscription creation regardless.
export async function validatePromoCode(code: string, ctx: ValidateContext, planPriceValue: number): Promise<ValidateResult> {
  const promoCode = await prisma.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } })
  if (!promoCode) return { error: "Invalid promo code" }
  if (!promoCode.active) return { error: "This promo code is no longer active" }
  if (promoCode.expiresAt && promoCode.expiresAt.getTime() < Date.now()) return { error: "This promo code has expired" }
  if (promoCode.minPlanDuration && ctx.planDuration < promoCode.minPlanDuration) {
    return { error: `This promo code requires a plan of at least ${promoCode.minPlanDuration} days` }
  }
  if (promoCode.restrictToGoal && promoCode.restrictToGoal !== ctx.goal) return { error: "This promo code isn't valid for your goal" }
  if (promoCode.restrictToTier && promoCode.restrictToTier !== ctx.tier) return { error: "This promo code isn't valid for this plan tier" }

  if (promoCode.maxRedemptions != null) {
    const totalRedemptions = await prisma.promoRedemption.count({ where: { promoCodeId: promoCode.id } })
    if (totalRedemptions >= promoCode.maxRedemptions) return { error: "This promo code has reached its redemption limit" }
  }

  if (ctx.customerId) {
    if (promoCode.maxRedemptionsPerCustomer != null) {
      const customerRedemptions = await prisma.promoRedemption.count({
        where: { promoCodeId: promoCode.id, customerId: ctx.customerId },
      })
      if (customerRedemptions >= promoCode.maxRedemptionsPerCustomer) {
        return { error: "You've already used this promo code the maximum number of times" }
      }
    }
    if (promoCode.firstSubscriptionOnly) {
      const priorSubscriptions = await prisma.subscription.count({
        where: { customerId: ctx.customerId, status: { in: ["ACTIVE", "EXPIRED", "CANCELLED"] } },
      })
      if (priorSubscriptions > 0) return { error: "This promo code is only valid for a first subscription" }
    }
  }

  const discountAmount = planPriceValue - applyDiscount(planPriceValue, promoCode.discountType, Number(promoCode.discountValue))
  return { promoCode, discountAmount }
}
