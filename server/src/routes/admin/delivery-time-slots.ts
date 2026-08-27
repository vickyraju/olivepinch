import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { validateBody } from "../../middleware/validate.js"

export const adminDeliveryTimeSlotsRouter = Router()
adminDeliveryTimeSlotsRouter.use(requireAdminAuth)

adminDeliveryTimeSlotsRouter.get("/", async (_req, res) => {
  res.json(await prisma.deliveryTimeSlot.findMany({ orderBy: { sortOrder: "asc" } }))
})

const slotSchema = z.object({
  label: z.string().min(1),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
})

adminDeliveryTimeSlotsRouter.post("/", validateBody(slotSchema), async (req, res) => {
  const slot = await prisma.deliveryTimeSlot.create({ data: req.body as never })
  res.status(201).json(slot)
})

adminDeliveryTimeSlotsRouter.patch("/:id", validateBody(slotSchema.partial()), async (req, res) => {
  const slot = await prisma.deliveryTimeSlot.update({ where: { id: req.params.id as string }, data: req.body as never })
  res.json(slot)
})
