import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { validateBody } from "../../middleware/validate.js"

export const adminOrdersRouter = Router()
adminOrdersRouter.use(requireAdminAuth)

// FR-A07: manually update each day's order status (kitchen/delivery are handled off-platform)
adminOrdersRouter.get("/", async (req, res) => {
  const date = String(req.query.date ?? new Date().toISOString().slice(0, 10))
  const orders = await prisma.order.findMany({
    where: { deliveryDate: new Date(`${date}T00:00:00.000Z`) },
    include: {
      items: { include: { menuItem: true } },
      subscription: { include: { customer: { select: { fullName: true, address: true, postcode: true } } } },
    },
    orderBy: { id: "asc" },
  })
  res.json(orders)
})

const statusSchema = z.object({
  status: z.enum(["SCHEDULED", "OUT_FOR_DELIVERY", "DELIVERED", "ATTEMPTED", "PAUSED"]),
})

adminOrdersRouter.patch("/:id/status", validateBody(statusSchema), async (req, res) => {
  const order = await prisma.order.update({
    where: { id: req.params.id as string },
    data: { status: (req.body as z.infer<typeof statusSchema>).status },
  })
  res.json(order)
})
