import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { validateBody } from "../../middleware/validate.js"
import { GOAL_VALUES, DIET_VALUES } from "../../lib/enums.js"

export const adminMenuItemsRouter = Router()
adminMenuItemsRouter.use(requireAdminAuth)

adminMenuItemsRouter.get("/", async (_req, res) => {
  res.json(await prisma.menuItem.findMany({ orderBy: [{ slot: "asc" }, { name: "asc" }] }))
})

const menuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  photoUrl: z.string().url().optional(),
  slot: z.enum(["BREAKFAST", "LUNCH", "DINNER"]),
  dietTags: z.array(z.enum(DIET_VALUES as [string, ...string[]])).min(1),
  allergenTags: z.array(z.string()).default([]),
  goalTags: z.array(z.enum(GOAL_VALUES as [string, ...string[]])).default([]),
  kcal: z.number().int().positive(),
  protein: z.number().int().nonnegative(),
  price: z.number().positive(),
  premium: z.boolean().default(false),
  dailyCapacity: z.number().int().positive().optional(),
})

// FR-A01: manage menu items (name, description, photo, dietary/allergen tags, price)
adminMenuItemsRouter.post("/", validateBody(menuItemSchema), async (req, res) => {
  const item = await prisma.menuItem.create({ data: req.body as never })
  res.status(201).json(item)
})

// FR-A02: daily production capacity is just another field on the item
adminMenuItemsRouter.patch("/:id", validateBody(menuItemSchema.partial()), async (req, res) => {
  const item = await prisma.menuItem.update({ where: { id: req.params.id as string }, data: req.body as never })
  res.json(item)
})

adminMenuItemsRouter.delete("/:id", async (req, res) => {
  await prisma.menuItem.delete({ where: { id: req.params.id as string } })
  res.status(204).send()
})
