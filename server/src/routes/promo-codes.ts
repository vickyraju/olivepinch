import { Router } from "express"
import { z } from "zod"
import { validateBody } from "../middleware/validate.js"
import { GOAL_VALUES, PLAN_TIER_VALUES } from "../lib/enums.js"
import { planPrice } from "../lib/pricing.js"
import { validatePromoCode } from "../lib/promo.js"
import type { Goal, PlanTier } from "@prisma/client"

export const promoCodesRouter = Router()

const validateSchema = z.object({
  code: z.string().min(1),
  goal: z.enum(GOAL_VALUES as [string, ...string[]]),
  tier: z.enum(PLAN_TIER_VALUES as [string, ...string[]]).default("BASIC"),
  planDuration: z.union([z.literal(7), z.literal(14), z.literal(28)]),
  customerId: z.string().optional(),
})

// Public: used both pre-account (signup preview) and post-account (renewal, and re-checked
// authoritatively at subscription creation) — see validatePromoCode for what's skipped
// when customerId is absent.
promoCodesRouter.post("/validate", validateBody(validateSchema), async (req, res) => {
  const body = req.body as z.infer<typeof validateSchema>
  const price = await planPrice(body.goal as Goal, body.planDuration, body.tier as PlanTier)
  const result = await validatePromoCode(body.code, { goal: body.goal as Goal, tier: body.tier as PlanTier, planDuration: body.planDuration, customerId: body.customerId }, price)
  if ("error" in result) return res.status(400).json({ error: result.error })
  res.json({
    valid: true,
    discountType: result.promoCode.discountType,
    discountValue: Number(result.promoCode.discountValue),
    discountAmount: result.discountAmount,
  })
})
