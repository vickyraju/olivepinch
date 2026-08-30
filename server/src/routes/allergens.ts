import { Router } from "express"
import { prisma } from "../lib/prisma.js"

export const allergensRouter = Router()

// Public — the subscribe funnel needs the current admin-configured allergen list before
// the customer has an account or is authenticated.
allergensRouter.get("/", async (_req, res) => {
  const allergens = await prisma.allergen.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } })
  res.json(allergens)
})
