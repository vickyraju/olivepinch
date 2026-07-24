import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { validateBody } from "../../middleware/validate.js"

export const adminZonesRouter = Router()
adminZonesRouter.use(requireAdminAuth)

// FR-A03: manage postcode/zone eligibility
adminZonesRouter.get("/", async (_req, res) => {
  res.json(await prisma.zone.findMany({ orderBy: { name: "asc" } }))
})

const zoneSchema = z.object({
  name: z.string().min(1),
  postcodePrefixes: z.array(z.string().min(1)).min(1),
  isActive: z.boolean().default(true),
})

adminZonesRouter.post("/", validateBody(zoneSchema), async (req, res) => {
  const zone = await prisma.zone.create({ data: req.body as never })
  res.status(201).json(zone)
})

adminZonesRouter.patch("/:id", validateBody(zoneSchema.partial()), async (req, res) => {
  const zone = await prisma.zone.update({ where: { id: req.params.id as string }, data: req.body as never })
  res.json(zone)
})
