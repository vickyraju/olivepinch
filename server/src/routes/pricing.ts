import { Router } from "express"
import { z } from "zod"
import { estimatePrice } from "../lib/pricing.js"
import { validateBody } from "../middleware/validate.js"
import { GOAL_VALUES, DIET_VALUES } from "../lib/enums.js"

export const pricingRouter = Router()

const estimateSchema = z.object({
  goal: z.enum(GOAL_VALUES as [string, ...string[]]),
  dietTypes: z.array(z.enum(DIET_VALUES as [string, ...string[]])).min(1),
  allergens: z.array(z.string()).default([]),
  mealsPerDay: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  planDuration: z.union([z.literal(7), z.literal(14), z.literal(28)]),
})

pricingRouter.post("/estimate", validateBody(estimateSchema), async (req, res) => {
  const body = req.body as z.infer<typeof estimateSchema>
  const result = await estimatePrice({
    goal: body.goal as never,
    dietTypes: body.dietTypes as never,
    allergens: body.allergens,
    mealsPerDay: body.mealsPerDay,
    planDuration: body.planDuration,
  })
  res.json({ perDay: result.perDay, total: result.total })
})
