import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { validateBody } from "../../middleware/validate.js"

export const adminCustomersRouter = Router()
adminCustomersRouter.use(requireAdminAuth)

// FR-A04: search/view profiles, subscription history, pause history, payment records
adminCustomersRouter.get("/", async (req, res) => {
  const search = String(req.query.search ?? "").trim()
  const customers = await prisma.customer.findMany({
    where: search
      ? { OR: [{ fullName: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, fullName: true, email: true, postcode: true, accountStatus: true, createdAt: true },
  })
  res.json(customers)
})

adminCustomersRouter.get("/:id", async (req, res) => {
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: req.params.id as string },
    include: {
      subscriptions: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" } },
      healthLogs: { orderBy: { loggedAt: "desc" }, take: 5 },
    },
  })
  const { passwordHash: _passwordHash, ...safe } = customer
  res.json(safe)
})

// FR-A05: support tools — manual pause override (bypasses the 4/month cap)
adminCustomersRouter.post(
  "/:id/pause-override",
  validateBody(z.object({ subscriptionId: z.string(), date: z.string() })),
  async (req, res) => {
    const { subscriptionId, date } = req.body as { subscriptionId: string; date: string }
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { id: subscriptionId, customerId: req.params.id as string },
    })
    const pauseDate = new Date(`${date}T00:00:00.000Z`)
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { pausedDates: { push: pauseDate } },
    })
    await prisma.order.updateMany({ where: { subscriptionId: subscription.id, deliveryDate: pauseDate }, data: { status: "PAUSED" } })
    res.json({ pausedDates: updated.pausedDates })
  }
)

// FR-A05: refund issuance
adminCustomersRouter.post(
  "/:id/refund",
  validateBody(z.object({ paymentId: z.string() })),
  async (req, res) => {
    const { paymentId } = req.body as { paymentId: string }
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "refunded" },
    })
    res.json(payment)
  }
)

// FR-A05: manual account reactivation within the 3-month retention window
adminCustomersRouter.post("/:id/reactivate", async (req, res) => {
  const customer = await prisma.customer.update({
    where: { id: req.params.id as string },
    data: { accountStatus: "ACTIVE" },
  })
  res.json({ id: customer.id, accountStatus: customer.accountStatus })
})
