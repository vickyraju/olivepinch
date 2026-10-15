import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { validateBody } from "../../middleware/validate.js"
import { formatAddress } from "../../lib/address.js"
import { isPostcodeInActiveZone } from "../../lib/postcode.js"
import { GOAL_VALUES, DIET_VALUES, DELIVERY_SLOT_VALUES, DELIVERY_SLOT_LABELS } from "../../lib/enums.js"
import { PHONE_REGEX } from "../customers.js"
import { computeEndDate, londonToday, pickSubscriptions } from "../../lib/subscription.js"
import { renewalsFor, lastRenewedAt } from "../../lib/renewals.js"
import { diffCustomerEdit } from "../../lib/customer-edit.js"
import { checkDayMeals } from "../../lib/day-meals.js"
import { SLOTS_BY_MEALS_PER_DAY } from "../../lib/pricing.js"
import { calculateAge } from "../../lib/age.js"
import { sendEmail } from "../../lib/email.js"
import { cancellationEmail } from "../../lib/email-templates.js"
import { worldpayConfig, getRefundActions, refundFull, refundPartial } from "../../lib/worldpay.js"
import { exactFractionOfPence } from "../../lib/money.js"

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
  // "Recently renewed" window in days; anything else means no renewal filter.
  const renewedDays = [7, 14, 30].includes(Number(req.query.renewed)) ? Number(req.query.renewed) : null
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
    // Newest first, regardless of status — renewals create a new row per plan, so [0] doubles as
    // both "their current plan" (for goal/duration/end-date columns) and, via its status, whether
    // they're presently subscribed. The full list (plus succeeded payments) is what renewals are
    // derived from.
    subscriptions: {
      orderBy: { createdAt: "desc" as const },
      select: {
        id: true,
        createdAt: true,
        status: true,
        planDuration: true,
        mealsPerDay: true,
        tier: true,
        startDate: true,
        pausedDates: true,
        discountAmount: true,
      },
    },
    payments: {
      where: { status: "succeeded" },
      select: { subscriptionId: true, status: true, paidAt: true, amount: true },
    },
  }

  function toRow(c: Awaited<ReturnType<typeof prisma.customer.findFirstOrThrow<{ select: typeof select }>>>) {
    // Skips an unpaid renewal attempt, which would otherwise show a paying customer as Unsubscribed.
    const latest = pickSubscriptions(c.subscriptions)?.current
    const planEndDate = latest ? computeEndDate(latest.startDate, latest.planDuration, latest.pausedDates) : null
    const { subscriptions, payments, ...c2 } = c
    return {
      ...c2,
      lastRenewedAt: lastRenewedAt(renewalsFor(subscriptions, payments)),
      // "Subscribed"/"Unsubscribed" is the admin-facing status — whether they currently have an
      // active subscription — distinct from accountStatus, which is the identity/login state.
      subscribed: latest?.status === "ACTIVE",
      planDuration: latest?.planDuration ?? null,
      planEndDate,
      address: formatAddress(c),
    }
  }

  if (sort === "planEndDate" || sort === "lastRenewed" || renewedDays) {
    // ponytail: plan end date and renewal dates are derived (startDate + duration + pauses; later
    // paid subscriptions), not sortable/filterable DB columns, so these sort and filter in memory
    // rather than at the DB. Fine at this customer-base scale (single-city delivery); move to
    // stored columns if the table grows large.
    const all = (await prisma.customer.findMany({ where, select, orderBy: SORTABLE[sort as keyof typeof SORTABLE] ?? SORTABLE.newest })).map(toRow)
    const cutoff = renewedDays ? Date.now() - renewedDays * 86_400_000 : null
    const matching = cutoff === null ? all : all.filter((r) => r.lastRenewedAt !== null && r.lastRenewedAt.getTime() >= cutoff)
    const newestFirst = (field: "planEndDate" | "lastRenewedAt") => (a: (typeof all)[number], b: (typeof all)[number]) => {
      if (a[field] === null) return 1
      if (b[field] === null) return -1
      return b[field]!.getTime() - a[field]!.getTime()
    }
    const ordered = sort === "planEndDate" ? [...matching].sort(newestFirst("planEndDate")) : sort === "lastRenewed" ? [...matching].sort(newestFirst("lastRenewedAt")) : matching
    const rows = ordered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    return res.json({ customers: rows, page, pageSize: PAGE_SIZE, total: matching.length, totalPages: Math.max(1, Math.ceil(matching.length / PAGE_SIZE)) })
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
  // Last delivery day of each plan (start + length + paused days), computed once here so the page never re-derives it.
  const subscriptions = customer.subscriptions.map((sub) => ({
    ...sub,
    endDate: computeEndDate(sub.startDate, sub.planDuration, sub.pausedDates),
  }))
  const current = pickSubscriptions(customer.subscriptions)?.current
  const currentWithEnd = current ? subscriptions.find((sub) => sub.id === current.id) : undefined
  res.json({
    ...safe,
    subscriptions,
    planEndDate: currentWithEnd?.endDate ?? null,
    planStatus: current?.status ?? null,
    planCancelledAt: current?.cancelledAt ?? null,
    address: formatAddress(customer),
    renewals: renewalsFor(customer.subscriptions, customer.payments),
  })
})

function logAction(adminId: string, action: string, customerId?: string, detail?: string) {
  return prisma.adminAuditLog.create({ data: { adminId, action, customerId, detail } })
}

// Full admin edit of a customer's details: any subset of the fields below. Each field is validated like
// the customer-facing signup rules (phone format, age 16-100, delivery-zone postcode), but admins can
// change things customers can't edit themselves (name, email, date of birth, body measurements).
// Only real differences are written; the audit log records which fields changed (never health or
// contact values, see lib/customer-edit.ts).
const optionalText = (max: number) => z.string().trim().max(max).nullable()
const requiredText = (max: number) => z.string().trim().min(1, "This can't be empty").max(max)

const editCustomerSchema = z.object({
  fullName: requiredText(100).optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200).optional(),
  phone: z.union([z.string().regex(PHONE_REGEX, "Enter the phone number in international format, e.g. +447123456789"), z.literal(""), z.null()]).optional(),
  gender: optionalText(50).optional(),
  dateOfBirth: z
    .union([
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth")
        .refine((v) => !isNaN(new Date(v).getTime()), "Enter a valid date of birth")
        .refine((v) => {
          const age = calculateAge(new Date(v))
          return age >= 16 && age <= 100
        }, "Age must be between 16 and 100"),
      z.literal(""),
      z.null(),
    ])
    .optional(),
  heightCm: z.number().min(50, "Height looks too small (cm)").max(260, "Height looks too large (cm)").nullable().optional(),
  weightKg: z.number().min(20, "Weight looks too small (kg)").max(500, "Weight looks too large (kg)").nullable().optional(),
  goal: z.enum(GOAL_VALUES as [string, ...string[]]).optional(),
  dietTypes: z.array(z.enum(DIET_VALUES as [string, ...string[]])).min(1, "Choose at least one food type").optional(),
  allergens: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  addressDoorNumber: requiredText(30).optional(),
  addressBuildingName: optionalText(100).optional(),
  addressStreet: requiredText(120).optional(),
  addressArea: requiredText(100).optional(),
  addressPostcode: requiredText(12).optional(),
  marketingOptIn: z.boolean().optional(),
  // DELETED is a data-scrubbing flow of its own, and PROVISIONAL is a signup state, so neither is offered here.
  accountStatus: z.enum(["ACTIVE", "READ_ONLY"]).optional(),
})

adminCustomersRouter.patch("/:id", validateBody(editCustomerSchema), async (req, res) => {
  const id = req.params.id as string
  const edit = req.body as z.infer<typeof editCustomerSchema>
  const existing = await prisma.customer.findUniqueOrThrow({ where: { id } })
  if (existing.accountStatus === "DELETED") {
    return res.status(400).json({ error: "This account has been deleted, so its details can't be edited." })
  }

  const { data, changed, detail, emailChanged } = diffCustomerEdit(existing, edit)
  if (changed.length === 0) return res.json({ changed: [] })

  if (emailChanged) {
    const taken = await prisma.customer.findUnique({ where: { email: String(data.email) }, select: { id: true } })
    if (taken && taken.id !== id) return res.status(409).json({ error: "Another customer already uses that email address." })
  }
  // Same delivery-zone rule as the customer's own address edit: we only deliver to active zones.
  if (changed.includes("addressPostcode") && !(await isPostcodeInActiveZone(String(data.addressPostcode)))) {
    return res.status(400).json({ error: "That postcode isn't in an active delivery zone. Add it under Postcode Coverage first." })
  }

  await prisma.$transaction([
    prisma.customer.update({ where: { id }, data: data as never }),
    // A change of marketing consent is a consent record, as it is when the customer does it at signup.
    ...(changed.includes("marketingOptIn")
      ? [prisma.consentLog.create({ data: { customerId: id, consentType: "marketing", granted: Boolean(data.marketingOptIn), version: "1.0" } })]
      : []),
    prisma.adminAuditLog.create({ data: { adminId: req.adminId!, action: "customer-edit", customerId: id, detail } }),
  ])
  res.json({ changed, emailChanged })
})

// Admin edit of how a plan is delivered: the delivery slot (daily / weekly / alternate days) and the
// time window. Plan length, tier and meals per day are deliberately not editable here: they decide what
// the customer paid, so changing them means cancelling and starting a new plan.
const editSubscriptionSchema = z.object({
  deliverySlot: z.enum(DELIVERY_SLOT_VALUES as [string, ...string[]]).optional(),
  deliveryTimeSlot: z.string().trim().min(1).optional(),
})

adminCustomersRouter.patch("/:id/subscriptions/:subscriptionId", validateBody(editSubscriptionSchema), async (req, res) => {
  const edit = req.body as z.infer<typeof editSubscriptionSchema>
  const subscription = await prisma.subscription.findFirstOrThrow({
    where: { id: req.params.subscriptionId as string, customerId: req.params.id as string },
  })
  if (subscription.status !== "ACTIVE") return res.status(400).json({ error: "Only an active plan can be edited." })

  if (edit.deliveryTimeSlot && edit.deliveryTimeSlot !== subscription.deliveryTimeSlot) {
    // Same rule as customer renewal: only a time window that is currently offered.
    if (!(await prisma.deliveryTimeSlot.findFirst({ where: { label: edit.deliveryTimeSlot, active: true } }))) {
      return res.status(400).json({ error: "That delivery time window isn't available. Pick one of the active windows." })
    }
  }
  const data: { deliverySlot?: never; deliveryTimeSlot?: string } = {}
  const changes: string[] = []
  if (edit.deliverySlot && edit.deliverySlot !== subscription.deliverySlot) {
    data.deliverySlot = edit.deliverySlot as never
    changes.push(`delivery ${DELIVERY_SLOT_LABELS[subscription.deliverySlot]} → ${DELIVERY_SLOT_LABELS[edit.deliverySlot as keyof typeof DELIVERY_SLOT_LABELS]}`)
  }
  if (edit.deliveryTimeSlot && edit.deliveryTimeSlot !== subscription.deliveryTimeSlot) {
    data.deliveryTimeSlot = edit.deliveryTimeSlot
    changes.push(`time window ${subscription.deliveryTimeSlot} → ${edit.deliveryTimeSlot}`)
  }
  if (changes.length === 0) return res.json({ changed: false })

  await prisma.$transaction([
    prisma.subscription.update({ where: { id: subscription.id }, data }),
    prisma.adminAuditLog.create({
      data: { adminId: req.adminId!, action: "subscription-edit", customerId: req.params.id as string, detail: `subscription ${subscription.id}: ${changes.join("; ")}` },
    }),
  ])
  res.json({ changed: true })
})

// Admin sets the meals on specific upcoming days of a plan. Not limited to the published menu or the Friday
// cutoff (that is for customers), but a meal must fit its box, the day must still be changeable, and a meal
// containing an allergen the customer avoids is refused. Any problem rejects the whole request, so a save
// never leaves some days changed and others not.
const dayMealsSchema = z.object({
  dayItems: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), items: z.array(z.string()).min(1).max(3) })).min(1).max(60),
})

adminCustomersRouter.patch("/:id/subscriptions/:subscriptionId/meals", validateBody(dayMealsSchema), async (req, res) => {
  const { dayItems } = req.body as z.infer<typeof dayMealsSchema>
  const subscription = await prisma.subscription.findFirstOrThrow({
    where: { id: req.params.subscriptionId as string, customerId: req.params.id as string },
    include: { customer: { select: { allergens: true, dietTypes: true } }, orders: { select: { id: true, deliveryDate: true, status: true } } },
  })
  if (subscription.status !== "ACTIVE") return res.status(400).json({ error: "Only an active plan's meals can be edited." })

  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: [...new Set(dayItems.flatMap((d) => d.items))] } } })
  const { errors, warnings, updates } = checkDayMeals({
    slots: SLOTS_BY_MEALS_PER_DAY[subscription.mealsPerDay as 1 | 2 | 3],
    orders: subscription.orders.map((o) => ({ id: o.id, date: o.deliveryDate.toISOString().slice(0, 10), status: o.status })),
    customer: subscription.customer,
    menuItems: new Map(menuItems.map((m) => [m.id, m])),
    dayItems,
    today: londonToday().toISOString().slice(0, 10),
  })
  if (errors.length > 0) return res.status(400).json({ error: errors.join(" "), problems: errors })

  await prisma.$transaction([
    ...updates.flatMap((u) => [
      prisma.orderItem.deleteMany({ where: { orderId: u.orderId } }),
      prisma.orderItem.createMany({ data: u.items.map((i) => ({ orderId: u.orderId, menuItemId: i.menuItemId, slot: i.slot as never })) }),
      // An explicit admin choice, so the day drops off the "hasn't chosen yet" list.
      prisma.order.update({ where: { id: u.orderId }, data: { menuChosenAt: new Date() } }),
    ]),
    prisma.adminAuditLog.create({
      data: { adminId: req.adminId!, action: "day-meals-edit", customerId: req.params.id as string, detail: `subscription ${subscription.id}: ${updates.map((u) => u.date).join(", ")}` },
    }),
  ])
  res.json({ updatedDays: updates.map((u) => u.date), warnings })
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

// FR-A05: refund issuance — full, percentage, custom amount, or prorated by unused plan days.
// Percentage/prorated math is done in exact integer pence (see lib/money.ts) rather than plain
// floating-point pounds, for the same reason promo.ts's discount math was: a naive
// `amount * (pct/100)` can be off by a penny at exact rounding boundaries.
const refundSchema = z.object({
  paymentId: z.string(),
  mode: z.enum(["full", "percentage", "prorated", "custom"]),
  value: z.number().positive().optional(), // percentage (1-100) for "percentage", GBP amount for "custom"
})

adminCustomersRouter.post("/:id/refund", validateBody(refundSchema), async (req, res) => {
  const { paymentId, mode, value } = req.body as z.infer<typeof refundSchema>

  // Verify the payment actually belongs to the customer in the URL before touching it —
  // without this, any valid paymentId would be accepted regardless of :id, so the audit
  // log could misattribute a refund to the wrong customer.
  const payment = await prisma.payment.findFirstOrThrow({
    where: { id: paymentId, customerId: req.params.id as string },
    include: { subscription: true },
  })
  if (payment.status !== "succeeded") {
    return res.status(400).json({ error: "Only a succeeded payment can be refunded" })
  }
  if (payment.refundedAmount != null) {
    return res.status(409).json({ error: "This payment has already been refunded" })
  }

  const paidPence = Math.round(Number(payment.amount) * 100)
  let refundPence: number
  if (mode === "full") {
    refundPence = paidPence
  } else if (mode === "percentage") {
    if (!value || value <= 0 || value > 100) return res.status(400).json({ error: "Enter a percentage between 1 and 100" })
    refundPence = exactFractionOfPence(paidPence, Math.round(value * 100), 10000)
  } else if (mode === "prorated") {
    const sub = payment.subscription
    if (!sub) return res.status(400).json({ error: "No subscription linked to this payment" })
    // Days already used, inclusive of today (day 4 of a 28-day plan used today -> 4 used, 24
    // left) — pauses aren't factored in here (a paused day is still "unused" whichever side of
    // today it falls on), which is a deliberate simplification, not an oversight.
    const today = londonToday()
    const daysUsed = Math.max(0, Math.min(sub.planDuration, Math.floor((today.getTime() - sub.startDate.getTime()) / 86_400_000) + 1))
    const remainingDays = sub.planDuration - daysUsed
    refundPence = exactFractionOfPence(paidPence, remainingDays, sub.planDuration)
  } else {
    if (!value || value <= 0) return res.status(400).json({ error: "Enter a refund amount greater than 0" })
    refundPence = Math.round(value * 100)
  }
  refundPence = Math.min(refundPence, paidPence) // never refund more than was actually paid

  const reference = `refund-${paymentId}`
  if (worldpayConfig) {
    if (!payment.providerRef) return res.status(400).json({ error: "No Worldpay reference stored for this payment" })
    const actions = await getRefundActions(payment.providerRef)
    if (refundPence >= paidPence) {
      if (!actions.refundHref) return res.status(502).json({ error: "Worldpay didn't return a refund action for this payment" })
      await refundFull(actions.refundHref)
    } else {
      if (!actions.partialRefundHref) return res.status(502).json({ error: "Worldpay didn't return a partial-refund action for this payment" })
      await refundPartial(actions.partialRefundHref, refundPence, "GBP", reference)
    }
  }
  // Only reached once the Worldpay call above has actually succeeded (or in dev mode, where
  // there's no real payment to refund) — a failed Worldpay call throws before this line, so a
  // customer's payment is never marked refunded unless the money actually moved.

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "refunded", refundedAmount: refundPence / 100, refundReference: reference },
  })
  await logAction(req.adminId!, "refund", req.params.id as string, `payment ${paymentId}: ${mode} refund of £${(refundPence / 100).toFixed(2)}`)
  res.json(updated)
})

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
  validateBody(z.object({ subscriptionId: z.string(), reason: z.string().trim().max(500).optional() })),
  async (req, res) => {
    const { subscriptionId, reason } = req.body as { subscriptionId: string; reason?: string }
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { id: subscriptionId, customerId: req.params.id as string },
      include: { customer: true },
    })
    if (subscription.status !== "ACTIVE") {
      return res.status(400).json({ error: "Only active subscriptions can be cancelled" })
    }
    const today = londonToday()
    const endDate = computeEndDate(subscription.startDate, subscription.planDuration, subscription.pausedDates)
    if (endDate.getTime() <= today.getTime()) {
      return res.status(400).json({ error: "This plan can't be cancelled on its last day" })
    }
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason || null },
    })
    await prisma.order.updateMany({
      where: { subscriptionId: subscription.id, deliveryDate: { gte: today }, status: "SCHEDULED" },
      data: { status: "PAUSED" },
    })
    await logAction(
      req.adminId!,
      "cancel-subscription",
      req.params.id as string,
      reason ? `subscription ${subscription.id}. Reason: ${reason}` : `subscription ${subscription.id}. No reason given`
    )
    if (subscription.customer.email) {
      try {
        const { subject, text, html } = cancellationEmail({
          name: subscription.customer.fullName,
          // Orders from `today` onward were just paused above, so this is the first day
          // with no delivery — the fact the customer actually needs confirmed.
          effectiveDate: today.toISOString().slice(0, 10),
          dashboardUrl: `${process.env.APP_URL ?? "http://localhost:5173"}/dashboard/subscription`,
        })
        await sendEmail(subscription.customer.email, subject, text, html)
      } catch (err) {
        console.error("cancellation email failed", subscription.id, err)
      }
    }
    res.json({ id: updated.id, status: updated.status })
  }
)

// What the customer changed on their own account (address, pauses, menu choices...), newest first.
adminCustomersRouter.get("/:id/activity", async (req, res) => {
  const rows = await prisma.customerActivity.findMany({
    where: { customerId: req.params.id as string },
    orderBy: { createdAt: "desc" },
    take: 200,
  })
  res.json(rows)
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
