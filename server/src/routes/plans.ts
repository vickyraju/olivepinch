import { Router } from "express"
import { prisma } from "../lib/prisma.js"

export const plansRouter = Router()

// Public — the subscribe funnel needs plan-based/goal-based prices before the customer
// has an account or is authenticated.
plansRouter.get("/", async (_req, res) => {
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: [{ goal: "asc" }, { planDuration: "asc" }] })
  res.json(plans)
})
