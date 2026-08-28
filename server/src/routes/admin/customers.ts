import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { validateBody } from "../../middleware/validate.js"
import { formatAddress } from "../../lib/address.js"
import { isPostcodeInActiveZone } from "../../lib/postcode.js"
import { GOAL_VALUES, DIET_VALUES } from "../../lib/enums.js"
import { PHONE_REGEX } from "../customers.js"
import { computeEndDate } from "../../lib/subscription.js"

export const adminCustomersRouter = Router()
adminCustomersRouter.use(requireAdminAuth)

const PAGE_SIZE = 50
const SORTABLE = { newest: { createdAt: "desc" as const }, oldest: { createdAt: "asc" as const } }

// FR-A04: search/view profiles, subscription history, pause history, payment records
adminCustomersRouter.get("/", async (req, res) => {
  const search = String(req.query.search ?? "").trim()
  const status = String(req.query.status ?? "").trim()
  const subscribed = String(req.query.subscribed ?? "").trim()
  const sort = String(req.query.sort ?? "newest")
  const page = Math.max(1, Number(req.query.page ?? 1) || 1)
  const where = {
    ...(search ? { OR: [{ fullName: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] } : {}),
    ...(status ? { accountStatus: status as never } : {}),
    ...(subscribed === "true" ? { subscriptions: { some: { status: "ACTIVE" as const } } } : {}),
    ...(subscribed === "false" ? { subscriptions: { none: { status: "ACTIVE" as const } } } : {}),
  }

  const select = {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    postcode: true,
    accountStatus: true,
    goal: true,
    createdAt: true,
    addressDoorNumber: true,
    addressBuildingName: true,
    addressStreet: true,
    addressArea: true,
    addressPostcode: true,
    // Most recent subscription regardless of status — renewals create a new row per plan, so
    // this doubles as both "their current plan" (for goal/duration/end-date columns) and,
    // via its status, whether they're presently subscribed.
    subscriptions: {
      orderBy: { createdAt: "desc" as const },
      select: { status: true, planDuration: true, startDate: true, pausedDates: true },
      take: 1,
    },
  }

  function toRow(c: Awaited<ReturnType<typeof prisma.customer.findFirstOrThrow<{ select: typeof select }>>>) {
    const latest = c.subscriptions[0]
    const planEndDate = latest ? computeEndDate(latest.startDate, latest.planDuration, latest.pausedDates) : null
    const { subscriptions, ...c2 } = c
    return {
      ...c2,
      // "Subscribed"/"Unsubscribed" is the admin-facing status — whether they currently have an
      // active subscription — distinct from accountStatus, which is the identity/login state.
      subscribed: latest?.status === "ACTIVE",
      planDuration: latest?.planDuration ?? null,
      planEndDate,
      address: formatAddress(c),
    }
  }

  if (sort === "planEndDate") {
    // ponytail: plan end date is computed (startDate + duration + pauses), not a sortable DB
    // column, so this sorts in memory rather than at the DB. Fine at this customer-base scale
    // (single-city delivery); move to a stored/generated column if the table grows large.
    const all = await prisma.customer.findMany({ where, select })
    const total = all.length
    const rows = all
      .map(toRow)
      .sort((a, b) => {
        if (a.planEndDate === null) return 1
        if (b.planEndDate === null) return -1
        return b.planEndDate.getTime() - a.planEndDate.getTime()
      })
      .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    return res.json({ customers: rows, page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) })
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: SORTABLE[sort as keyof typeof SORTABLE] ?? SORTABLE.newest,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select,
    }),
    prisma.customer.count({ where }),
  ])

  res.json({
    customers: customers.map(toRow),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  })
})

adminCustomersRouter.get("/:id", async (req, res) => {
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: req.params.id as string },
    include: {
      subscriptions: {
        orderBy: { createdAt: "desc" },
        include: { orders: { orderBy: { deliveryDate: "asc" }, include: { items: { include: { menuItem: true } } } } },
      },
      payments: { orderBy: { createdAt: "desc" } },
      healthLogs: { orderBy: { loggedAt: "desc" }, take: 5 },
    },
  })
  const { passwordHash: _passwordHash, ...safe } = customer
  res.json({ ...safe, address: formatAddress(customer) })
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

// Symmetric counterpart to pause-override — admin overrides aren't capped, so this is a plain
// undo rather than a call into the customer's own capped /subscriptions/:id/resume.
adminCustomersRouter.post(
  "/:id/resume-override",
  validateBody(z.object({ subscriptionId: z.string(), date: z.string() })),
  async (req, res) => {
    const { subscriptionId, date } = req.body as { subscriptionId: string; date: string }
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { id: subscriptionId, customerId: req.params.id as string },
    })
    const target = new Date(`${date}T00:00:00.000Z`).getTime()
    const nextPaused = subscription.pausedDates.filter((d) => d.getTime() !== target)
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { pausedDates: { set: nextPaused } },
    })
    await prisma.order.updateMany({ where: { subscriptionId: subscription.id, deliveryDate: new Date(target) }, data: { status: "SCHEDULED" } })
    await logAction(req.adminId!, "resume-override", req.params.id as string, `subscription ${subscription.id}, date ${date}`)
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

const updateAddressSchema = z.object({
  phone: z.string().regex(PHONE_REGEX, "Enter a valid phone number"),
  addressDoorNumber: z.string().min(1),
  addressBuildingName: z.string().optional(),
  addressStreet: z.string().min(1),
  addressArea: z.string().min(1),
  addressPostcode: z.string().min(1),
})

// Mirrors customersRouter's PATCH /me/address (customers.ts) — same postcode re-check, since
// we only deliver to Birmingham right now. A support call editing the address on a customer's
// behalf must not be able to move them somewhere undeliverable either.
adminCustomersRouter.patch("/:id/address", validateBody(updateAddressSchema), async (req, res) => {
  const body = req.body as z.infer<typeof updateAddressSchema>
  if (!(await isPostcodeInActiveZone(body.addressPostcode))) {
    return res.status(400).json({ error: "We don't currently deliver to that postcode" })
  }
  const customer = await prisma.customer.update({ where: { id: req.params.id as string }, data: body })
  await logAction(req.adminId!, "address-edit", req.params.id as string)
  const { passwordHash: _passwordHash, ...safe } = customer
  res.json({ ...safe, address: formatAddress(customer) })
})

const preferencesSchema = z.object({
  goal: z.enum(GOAL_VALUES as [string, ...string[]]),
  dietTypes: z.array(z.enum(DIET_VALUES as [string, ...string[]])).min(1),
  allergens: z.array(z.string()).default([]),
})

// Deliberately not the open PATCH /customers/:id/preferences (customers.ts) — that route has
// no requireAuth at all, since it's used mid-signup before any account exists to auth as.
// Routing admin traffic through it would mean this "admin capability" isn't actually gated by
// admin auth and leaves no audit trail. This is a separate, admin-gated, audit-logged route.
adminCustomersRouter.patch("/:id/preferences", validateBody(preferencesSchema), async (req, res) => {
  const body = req.body as z.infer<typeof preferencesSchema>
  const customer = await prisma.customer.update({
    where: { id: req.params.id as string },
    data: { goal: body.goal as never, dietTypes: body.dietTypes as never, allergens: body.allergens },
  })
  await logAction(req.adminId!, "preferences-edit", req.params.id as string)
  res.json({ id: customer.id })
})

// FR-A05: admin-initiated cancellation. Refunds are handled offline in Worldpay by the admin;
// this just stops the plan going forward. Blocked on the plan's last day since there's nothing
// left to stop by then (a 7-day plan can be cancelled through day 6, not day 7).
adminCustomersRouter.post(
  "/:id/cancel-subscription",
  validateBody(z.object({ subscriptionId: z.string(), reason: z.string().optional() })),
  async (req, res) => {
    const { subscriptionId, reason } = req.body as { subscriptionId: string; reason?: string }
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { id: subscriptionId, customerId: req.params.id as string },
    })
    if (subscription.status !== "ACTIVE") {
      return res.status(400).json({ error: "Only active subscriptions can be cancelled" })
    }
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const endDate = computeEndDate(subscription.startDate, subscription.planDuration, subscription.pausedDates)
    if (endDate.getTime() <= today.getTime()) {
      return res.status(400).json({ error: "This plan can't be cancelled on its last day" })
    }
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "CANCELLED" },
    })
    await prisma.order.updateMany({
      where: { subscriptionId: subscription.id, deliveryDate: { gte: today }, status: "SCHEDULED" },
      data: { status: "PAUSED" },
    })
    await logAction(
      req.adminId!,
      "cancel-subscription",
      req.params.id as string,
      reason ? `subscription ${subscription.id}: ${reason}` : `subscription ${subscription.id}`
    )
    res.json({ id: updated.id, status: updated.status })
  }
)

// Support-action history for this customer, shown in the admin detail view
adminCustomersRouter.get("/:id/audit-log", async (req, res) => {
  const logs = await prisma.adminAuditLog.findMany({
    where: { customerId: req.params.id as string },
    include: { admin: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })
  res.json(logs)
})
