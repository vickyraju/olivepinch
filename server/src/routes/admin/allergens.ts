import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { validateBody } from "../../middleware/validate.js"

export const adminAllergensRouter = Router()
adminAllergensRouter.use(requireAdminAuth)

adminAllergensRouter.get("/", async (_req, res) => {
  res.json(await prisma.allergen.findMany({ orderBy: { sortOrder: "asc" } }))
})

const allergenSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
})

adminAllergensRouter.post("/", validateBody(allergenSchema), async (req, res) => {
  const allergen = await prisma.allergen.create({ data: req.body as never })
  res.status(201).json(allergen)
})

adminAllergensRouter.patch("/:id", validateBody(allergenSchema.partial()), async (req, res) => {
  const allergen = await prisma.allergen.update({ where: { id: req.params.id as string }, data: req.body as never })
  res.json(allergen)
})
