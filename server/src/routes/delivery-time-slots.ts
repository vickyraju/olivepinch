import { Router } from "express"
import { prisma } from "../lib/prisma.js"

export const deliveryTimeSlotsRouter = Router()

// Public — the subscribe funnel and renewal form need the current admin-configured
// delivery windows before the customer has an account or is authenticated.
deliveryTimeSlotsRouter.get("/", async (_req, res) => {
  const slots = await prisma.deliveryTimeSlot.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } })
  res.json(slots)
})
