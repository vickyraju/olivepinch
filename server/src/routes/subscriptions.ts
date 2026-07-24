import { Router } from "express"
import { z } from "zod"
import { prisma } from "../lib/prisma.js"
import { requireAuth } from "../middleware/auth.js"
import { validateBody } from "../middleware/validate.js"
import { GOAL_VALUES, DIET_VALUES } from "../lib/enums.js"
import { SLOTS_BY_MEALS_PER_DAY, defaultMenuItemFor } from "../lib/pricing.js"
import { computeEndDate, pausesUsedThisMonth, buildDeliveryDates, MAX_PAUSES_PER_MONTH } from "../lib/subscription.js"
import type { Goal, DietType, MealSlot } from "@prisma/client"

export const subscriptionsRouter = Router()

const createSchema = z.object({
  customerId: z.string(),
  planDuration: z.union([z.literal(7), z.literal(14), z.literal(28)]),
  startDate: z.string(), // YYYY-MM-DD
  mealsPerDay: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  address: z.string().min(1),
})

// Builds every day's default menu server-side (source of truth for FR-C10/FR-C12 pricing)
// and creates the Subscription + Order + OrderItem rows in one transaction.
subscriptionsRouter.post("/", validateBody(createSchema), async (req, res) => {
  const body = req.body as z.infer<typeof createSchema>
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: body.customerId } })
  if (!customer.goal || !customer.dietType) {
    return res.status(400).json({ error: "Customer must have goal and dietType set before subscribing" })
  }

  const slots = SLOTS_BY_MEALS_PER_DAY[body.mealsPerDay]
  const startDate = new Date(`${body.startDate}T00:00:00.000Z`)
  const deliveryDates = buildDeliveryDates(startDate, body.planDuration, [])

  const dayItems = await Promise.all(
    deliveryDates.map((date) =>
      Promise.all(
        slots.map(async (slot: MealSlot) => ({
          slot,
          date,
          item: await defaultMenuItemFor(customer.goal as Goal, customer.dietType as DietType, customer.allergens, slot),
        }))
      )
    )
  )

  const subscription = await prisma.subscription.create({
    data: {
      customerId: customer.id,
      planDuration: body.planDuration,
      startDate,
      mealsPerDay: body.mealsPerDay,
      status: "PENDING_PAYMENT",
      orders: {
        create: dayItems.map((day) => ({
          deliveryDate: day[0].date,
          items: { create: day.map((d) => ({ menuItemId: d.item.id, slot: d.slot })) },
        })),
      },
    },
    include: { orders: { include: { items: { include: { menuItem: true } } } } },
  })

  await prisma.customer.update({ where: { id: customer.id }, data: { address: body.address } })

  const total = subscription.orders.reduce(
    (sum, order) => sum + order.items.reduce((s, i) => s + Number(i.menuItem.price), 0),
    0
  )

  res.status(201).json({ subscriptionId: subscription.id, total, dayCount: subscription.orders.length })
})

subscriptionsRouter.use(requireAuth)

subscriptionsRouter.get("/current", async (req, res) => {
  const subscription = await prisma.subscription.findFirst({
    where: { customerId: req.customerId, status: { in: ["ACTIVE", "PENDING_PAYMENT"] } },
    orderBy: { createdAt: "desc" },
    include: { orders: { include: { items: { include: { menuItem: true } } }, orderBy: { deliveryDate: "asc" } } },
  })
  if (!subscription) return res.status(404).json({ error: "No active subscription" })

  const endDate = computeEndDate(subscription.startDate, subscription.planDuration, subscription.pausedDates)
  res.json({ ...subscription, endDate, pausesUsedThisMonth: pausesUsedThisMonth(subscription.pausedDates) })
})

const pauseSchema = z.object({ date: z.string() })

subscriptionsRouter.post("/:id/pause", validateBody(pauseSchema), async (req, res) => {
  const subscription = await prisma.subscription.findFirstOrThrow({
    where: { id: req.params.id as string, customerId: req.customerId },
  })
  if (pausesUsedThisMonth(subscription.pausedDates) >= MAX_PAUSES_PER_MONTH) {
    return res.status(400).json({ error: `You've used all ${MAX_PAUSES_PER_MONTH} pauses for this month.` })
  }
  const date = new Date(`${(req.body as z.infer<typeof pauseSchema>).date}T00:00:00.000Z`)
  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: { pausedDates: { push: date } },
  })
  await prisma.order.updateMany({ where: { subscriptionId: subscription.id, deliveryDate: date }, data: { status: "PAUSED" } })
  res.json({ pausedDates: updated.pausedDates })
})

subscriptionsRouter.post("/:id/resume", validateBody(pauseSchema), async (req, res) => {
  const subscription = await prisma.subscription.findFirstOrThrow({
    where: { id: req.params.id as string, customerId: req.customerId },
  })
  const target = new Date(`${(req.body as z.infer<typeof pauseSchema>).date}T00:00:00.000Z`).getTime()
  const nextPaused = subscription.pausedDates.filter((d) => d.getTime() !== target)
  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: { pausedDates: { set: nextPaused } },
  })
  await prisma.order.updateMany({
    where: { subscriptionId: subscription.id, deliveryDate: new Date(target) },
    data: { status: "SCHEDULED" },
  })
  res.json({ pausedDates: updated.pausedDates })
})

const renewSchema = z.object({
  planDuration: z.union([z.literal(7), z.literal(14), z.literal(28)]),
  goal: z.enum(GOAL_VALUES as [string, ...string[]]),
  dietType: z.enum(DIET_VALUES as [string, ...string[]]),
  allergens: z.array(z.string()).default([]),
})

// FR-C23: preferences carry over (client sends current values, editable before confirming);
// stays on the same session — caller keeps using their existing JWT, no re-login.
subscriptionsRouter.post("/:id/renew", validateBody(renewSchema), async (req, res) => {
  const body = req.body as z.infer<typeof renewSchema>
  await prisma.customer.update({
    where: { id: req.customerId },
    data: { goal: body.goal as never, dietType: body.dietType as never, allergens: body.allergens },
  })

  const slots = SLOTS_BY_MEALS_PER_DAY[2]
  const startDate = new Date()
  startDate.setUTCHours(0, 0, 0, 0)
  const deliveryDates = buildDeliveryDates(startDate, body.planDuration, [])
  const dayItems = await Promise.all(
    deliveryDates.map((date) =>
      Promise.all(
        slots.map(async (slot: MealSlot) => ({
          slot,
          date,
          item: await defaultMenuItemFor(body.goal as Goal, body.dietType as DietType, body.allergens, slot),
        }))
      )
    )
  )

  const subscription = await prisma.subscription.create({
    data: {
      customerId: req.customerId!,
      planDuration: body.planDuration,
      startDate,
      mealsPerDay: 2,
      status: "PENDING_PAYMENT",
      orders: {
        create: dayItems.map((day) => ({
          deliveryDate: day[0].date,
          items: { create: day.map((d) => ({ menuItemId: d.item.id, slot: d.slot })) },
        })),
      },
    },
    include: { orders: { include: { items: { include: { menuItem: true } } } } },
  })

  const total = subscription.orders.reduce(
    (sum, order) => sum + order.items.reduce((s, i) => s + Number(i.menuItem.price), 0),
    0
  )
  res.status(201).json({ subscriptionId: subscription.id, total })
})
