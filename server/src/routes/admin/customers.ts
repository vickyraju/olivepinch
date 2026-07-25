import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { validateBody } from "../../middleware/validate.js"

export const adminCustomersRouter = Router()
adminCustomersRouter.use(requireAdminAuth)

const PAGE_SIZE = 50

// FR-A04: search/view profiles, subscription history, pause history, payment records
adminCustomersRouter.get("/", async (req, res) => {
  const search = String(req.query.search ?? "").trim()
  const page = Math.max(1, Number(req.query.page ?? 1) || 1)
  const where = search
    ? { OR: [{ fullName: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] }
    : undefined

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, fullName: true, email: true, postcode: true, accountStatus: true, createdAt: true },
    }),
    prisma.customer.count({ where }),
  ])

  res.json({ customers, page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) })
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

function logAction(adminId: string, action: string, customerId?: string, detail?: string) {
  return prisma.adminAuditLog.create({ data: { adminId, action, customerId, detail } })
}

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
    await logAction(req.adminId!, "pause-override", req.params.id as string, `subscription ${subscription.id}, date ${date}`)
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
    await logAction(req.adminId!, "refund", req.params.id as string, `payment ${paymentId}`)
    res.json(payment)
  }
)

// FR-A05: manual account reactivation within the 3-month retention window
adminCustomersRouter.post("/:id/reactivate", async (req, res) => {
  const customer = await prisma.customer.update({
    where: { id: req.params.id as string },
    data: { accountStatus: "ACTIVE" },
  })
  await logAction(req.adminId!, "reactivate", req.params.id as string)
  res.json({ id: customer.id, accountStatus: customer.accountStatus })
})

// Support-action history for this customer, shown in the admin detail view
adminCustomersRouter.get("/:id/audit-log", async (req, res) => {
  const logs = await prisma.adminAuditLog.findMany({
    where: { customerId: req.params.id as string },
    include: { admin: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })
  res.json(logs)
})
