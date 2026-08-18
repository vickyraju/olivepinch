import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { validateBody } from "../../middleware/validate.js"
import { formatAddress } from "../../lib/address.js"
import { buildKitchenExportWorkbook } from "../../lib/kitchen-export.js"

export const adminOrdersRouter = Router()
adminOrdersRouter.use(requireAdminAuth)

// Styled .xlsx for the kitchen: portions needed per item per day, colored by meal slot, with
// an over-capacity flag against MenuItem.dailyCapacity. A single-day export is just this same
// query with from === to, not a separate code path.
adminOrdersRouter.get("/kitchen-export", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const from = String(req.query.from ?? today)
  const to = String(req.query.to ?? from)

  const workbook = await buildKitchenExportWorkbook(from, to)
  const filename = from === to ? `kitchen-export-${from}.xlsx` : `kitchen-export-${from}-to-${to}.xlsx`

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
  await workbook.xlsx.write(res)
  res.end()
})

// FR-A07: manually update each day's order status (kitchen/delivery are handled off-platform)
adminOrdersRouter.get("/", async (req, res) => {
  const date = String(req.query.date ?? new Date().toISOString().slice(0, 10))
  const orders = await prisma.order.findMany({
    where: { deliveryDate: new Date(`${date}T00:00:00.000Z`) },
    include: {
      items: { include: { menuItem: true } },
      subscription: {
        include: {
          customer: {
            select: {
              fullName: true,
              postcode: true,
              addressDoorNumber: true,
              addressBuildingName: true,
              addressStreet: true,
              addressArea: true,
              addressPostcode: true,
            },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  })
  res.json(
    orders.map((order) => ({
      ...order,
      subscription: {
        ...order.subscription,
        customer: { fullName: order.subscription.customer.fullName, address: formatAddress(order.subscription.customer), postcode: order.subscription.customer.postcode },
      },
    }))
  )
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
