import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { assertMonday } from "../lib/menu-week.js"

export const menuWeeksRouter = Router()

// Public — same trust level as /menu-items, which the signup funnel already reads without auth.
menuWeeksRouter.get("/:weekStart", async (req, res) => {
  const weekStart = assertMonday(req.params.weekStart as string)
  const menuWeek = await prisma.menuWeek.findUnique({
    where: { weekStart },
    include: { items: { include: { menuItem: true } } },
  })
  if (!menuWeek || !menuWeek.published) {
    return res.status(404).json({ error: "No published menu for that week" })
  }
  res.json({
    weekStart: menuWeek.weekStart.toISOString().slice(0, 10),
    items: menuWeek.items.map((wi) => wi.menuItem),
  })
})
