import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { validateBody } from "../../middleware/validate.js"
import { GOAL_VALUES, PLAN_TIER_VALUES } from "../../lib/enums.js"

export const adminPlansRouter = Router()
adminPlansRouter.use(requireAdminAuth)

adminPlansRouter.get("/", async (_req, res) => {
  res.json(await prisma.plan.findMany({ orderBy: [{ goal: "asc" }, { tier: "asc" }, { planDuration: "asc" }] }))
})

const planSchema = z.object({
  planDuration: z.union([z.literal(7), z.literal(14), z.literal(28)]),
  goal: z.enum(GOAL_VALUES as [string, ...string[]]),
  tier: z.enum(PLAN_TIER_VALUES as [string, ...string[]]),
  mealsPerDay: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  price: z.number().positive(),
  active: z.boolean().default(true),
})

// Plan-based/goal-based pricing: one row per (days, goal) combination, admin-managed.
adminPlansRouter.post("/", validateBody(planSchema), async (req, res) => {
  const plan = await prisma.plan.create({ data: req.body as never })
  res.status(201).json(plan)
})

adminPlansRouter.patch("/:id", validateBody(planSchema.partial()), async (req, res) => {
  const plan = await prisma.plan.update({ where: { id: req.params.id as string }, data: req.body as never })
  res.json(plan)
})

adminPlansRouter.delete("/:id", async (req, res) => {
  await prisma.plan.delete({ where: { id: req.params.id as string } })
  res.status(204).send()
})
