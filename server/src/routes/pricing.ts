import { Router } from "express"
import { z } from "zod"
import { planPrice } from "../lib/pricing.js"
import { validateBody } from "../middleware/validate.js"
import { GOAL_VALUES } from "../lib/enums.js"

export const pricingRouter = Router()

const estimateSchema = z.object({
  goal: z.enum(GOAL_VALUES as [string, ...string[]]),
  planDuration: z.union([z.literal(7), z.literal(14), z.literal(28)]),
  mealsPerDay: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
})

pricingRouter.post("/estimate", validateBody(estimateSchema), async (req, res) => {
  const body = req.body as z.infer<typeof estimateSchema>
  const total = await planPrice(body.goal as never, body.planDuration, undefined, body.mealsPerDay)
  res.json({ total, perDay: total / body.planDuration })
})
