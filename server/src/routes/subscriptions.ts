import { Router } from "express"
import { z } from "zod"
import { prisma } from "../lib/prisma.js"
import { requireAuth } from "../middleware/auth.js"
import { validateBody } from "../middleware/validate.js"
import { GOAL_VALUES, DIET_VALUES, DELIVERY_SLOT_VALUES, DELIVERY_TIME_SLOT_VALUES, PLAN_TIER_VALUES } from "../lib/enums.js"
import { SLOTS_BY_MEALS_PER_DAY, defaultMenuItemFor, planPrice } from "../lib/pricing.js"
import { computeEndDate, pausesUsedTotal, buildDeliveryDates, canPauseDate, PAUSE_LIMITS_BY_DURATION } from "../lib/subscription.js"
import { isPostcodeInActiveZone } from "../lib/postcode.js"
import { assertMonday, fridayCutoffFor, applyWeekSelection } from "../lib/menu-week.js"
import { validatePromoCode } from "../lib/promo.js"
import type { Goal, DietType, MealSlot, PlanTier } from "@prisma/client"

export const subscriptionsRouter = Router()

const createSchema = z.object({
  customerId: z.string(),
  planDuration: z.union([z.literal(7), z.literal(14), z.literal(28)]),
  startDate: z.string(), // YYYY-MM-DD
  mealsPerDay: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  email: z.string().email(),
  addressDoorNumber: z.string().min(1),
  addressBuildingName: z.string().optional(),
  addressStreet: z.string().min(1),
  addressArea: z.string().min(1),
  addressPostcode: z.string().min(1),
  deliverySlot: z.enum(DELIVERY_SLOT_VALUES as [string, ...string[]]).default("DAILY"),
  deliveryTimeSlot: z.enum(DELIVERY_TIME_SLOT_VALUES as [string, ...string[]]),
  tier: z.enum(PLAN_TIER_VALUES as [string, ...string[]]).default("BASIC"),
  // Optional per-day menu customization from the "customize your menu" funnel step.
  // items are menuItem ids, positionally matched to SLOTS_BY_MEALS_PER_DAY[mealsPerDay].
  // Falls back to the goal/diet-matched default when omitted.
  dayMenus: z.array(z.object({ date: z.string(), items: z.array(z.string()) })).optional(),
  promoCode: z.string().optional(),
})

// Builds every day's menu server-side (source of truth for FR-C10/FR-C12 pricing) — either
// from the caller's day-by-day selections (validated against real MenuItem ids) or the
// goal/diet-matched default — and creates the Subscription + Order + OrderItem rows in one
// transaction.
subscriptionsRouter.post("/", validateBody(createSchema), async (req, res) => {
  const body = req.body as z.infer<typeof createSchema>
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: body.customerId } })
  if (!customer.goal || customer.dietTypes.length === 0) {
    return res.status(400).json({ error: "Customer must have goal and dietTypes set before subscribing" })
  }
  if (!(await isPostcodeInActiveZone(body.addressPostcode))) {
    return res.status(400).json({ error: "We don't currently deliver to that postcode" })
  }

  const slots = SLOTS_BY_MEALS_PER_DAY[body.mealsPerDay]
  const startDate = new Date(`${body.startDate}T00:00:00.000Z`)
  const deliveryDates = buildDeliveryDates(startDate, body.planDuration, [])

  const customDayByDate = new Map((body.dayMenus ?? []).map((d) => [d.date, d.items]))
  const menuItemIds = new Set([...customDayByDate.values()].flat())
  const menuItemsById = menuItemIds.size
    ? new Map((await prisma.menuItem.findMany({ where: { id: { in: [...menuItemIds] } } })).map((m) => [m.id, m]))
    : new Map()

  const dayItems = await Promise.all(
    deliveryDates.map(async (date) => {
      const isoDate = date.toISOString().slice(0, 10)
      const customItemIds = customDayByDate.get(isoDate)

      return Promise.all(
        slots.map(async (slot: MealSlot, i: number) => {
          const customItemId = customItemIds?.[i]
          const customItem = customItemId ? menuItemsById.get(customItemId) : undefined
          if (customItemId && (!customItem || customItem.slot !== slot)) {
            throw Object.assign(new Error(`Invalid menu selection for ${isoDate} (${slot})`), { status: 400 })
          }
          return {
            slot,
            date,
            item: customItem ?? (await defaultMenuItemFor(customer.goal as Goal, customer.dietTypes as DietType[], customer.allergens, slot)),
          }
        })
      )
    })
  )

  const price = await planPrice(customer.goal as Goal, body.planDuration, body.tier as PlanTier, body.mealsPerDay)
  let promoCodeId: string | undefined
  let discountAmount = 0
  if (body.promoCode) {
    // Re-checked here, authoritatively — the signup-time /promo-codes/validate preview
    // doesn't know the customerId yet, so per-customer/first-subscription rules only get
    // enforced at this point.
    const result = await validatePromoCode(body.promoCode, { goal: customer.goal as Goal, tier: body.tier as PlanTier, planDuration: body.planDuration, customerId: customer.id }, price)
    if ("error" in result) return res.status(400).json({ error: result.error })
    promoCodeId = result.promoCode.id
    discountAmount = result.discountAmount
  }

  const subscription = await prisma.subscription.create({
    data: {
      customerId: customer.id,
      planDuration: body.planDuration,
      startDate,
      mealsPerDay: body.mealsPerDay,
      tier: body.tier as PlanTier,
      deliverySlot: body.deliverySlot as never,
      deliveryTimeSlot: body.deliveryTimeSlot as never,
      status: "PENDING_PAYMENT",
      promoCodeId,
      discountAmount,
      orders: {
        create: dayItems.map((day) => ({
          deliveryDate: day[0].date,
          items: { create: day.map((d) => ({ menuItemId: d.item.id, slot: d.slot })) },
        })),
      },
    },
    include: { orders: { include: { items: { include: { menuItem: true } } } } },
  })

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      email: body.email,
      addressDoorNumber: body.addressDoorNumber,
      addressBuildingName: body.addressBuildingName,
      addressStreet: body.addressStreet,
      addressArea: body.addressArea,
      addressPostcode: body.addressPostcode,
    },
  })

  const total = Math.max(0, price - discountAmount)

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
  res.json({
    ...subscription,
    endDate,
    pausesUsedTotal: pausesUsedTotal(subscription.pausedDates),
    pauseLimit: PAUSE_LIMITS_BY_DURATION[subscription.planDuration as 7 | 14 | 28],
  })
})

const pauseSchema = z.object({ date: z.string() })

subscriptionsRouter.post("/:id/pause", validateBody(pauseSchema), async (req, res) => {
  const subscription = await prisma.subscription.findFirstOrThrow({
    where: { id: req.params.id as string, customerId: req.customerId },
  })
  const date = new Date(`${(req.body as z.infer<typeof pauseSchema>).date}T00:00:00.000Z`)
  if (!canPauseDate(date)) {
    return res.status(400).json({ error: "Changes to this day must be made by noon the day before" })
  }
  const limit = PAUSE_LIMITS_BY_DURATION[subscription.planDuration as 7 | 14 | 28]
  if (pausesUsedTotal(subscription.pausedDates) >= limit) {
    return res.status(400).json({ error: `You've used all ${limit} pauses for this plan.` })
  }
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
  const target = new Date(`${(req.body as z.infer<typeof pauseSchema>).date}T00:00:00.000Z`)
  if (!canPauseDate(target)) {
    return res.status(400).json({ error: "Changes to this day must be made by noon the day before" })
  }
  const nextPaused = subscription.pausedDates.filter((d) => d.getTime() !== target.getTime())
  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: { pausedDates: { set: nextPaused } },
  })
  await prisma.order.updateMany({
    where: { subscriptionId: subscription.id, deliveryDate: target },
    data: { status: "SCHEDULED" },
  })
  res.json({ pausedDates: updated.pausedDates })
})

const weekSelectionSchema = z.object({
  dayItems: z.array(z.object({ date: z.string(), items: z.array(z.string()) })),
})

// Customer picks next week's menu from whatever the admin has published, up until the
// Friday cutoff (locks out once Saturday starts) for that week.
subscriptionsRouter.patch("/:id/menu-weeks/:weekStart", validateBody(weekSelectionSchema), async (req, res) => {
  await prisma.subscription.findFirstOrThrow({ where: { id: req.params.id as string, customerId: req.customerId } })
  const weekStart = assertMonday(req.params.weekStart as string)
  if (Date.now() >= fridayCutoffFor(weekStart).getTime()) {
    return res.status(400).json({ error: "Selection window has closed for this week" })
  }
  const { dayItems } = req.body as z.infer<typeof weekSelectionSchema>
  await applyWeekSelection(req.params.id as string, weekStart, dayItems)
  res.status(204).send()
})

const renewSchema = z.object({
  planDuration: z.union([z.literal(7), z.literal(14), z.literal(28)]),
  goal: z.enum(GOAL_VALUES as [string, ...string[]]),
  dietTypes: z.array(z.enum(DIET_VALUES as [string, ...string[]])).min(1),
  allergens: z.array(z.string()).default([]),
  mealsPerDay: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  deliverySlot: z.enum(DELIVERY_SLOT_VALUES as [string, ...string[]]),
  deliveryTimeSlot: z.enum(DELIVERY_TIME_SLOT_VALUES as [string, ...string[]]),
  tier: z.enum(PLAN_TIER_VALUES as [string, ...string[]]).default("BASIC"),
  promoCode: z.string().optional(),
})

// FR-C23: preferences carry over (client sends current values, editable before confirming);
// stays on the same session — caller keeps using their existing JWT, no re-login.
subscriptionsRouter.post("/:id/renew", validateBody(renewSchema), async (req, res) => {
  const body = req.body as z.infer<typeof renewSchema>
  await prisma.customer.update({
    where: { id: req.customerId },
    data: { goal: body.goal as never, dietTypes: body.dietTypes as never, allergens: body.allergens },
  })

  const slots = SLOTS_BY_MEALS_PER_DAY[body.mealsPerDay]
  const startDate = new Date()
  startDate.setUTCHours(0, 0, 0, 0)
  const deliveryDates = buildDeliveryDates(startDate, body.planDuration, [])
  const dayItems = await Promise.all(
    deliveryDates.map((date) =>
      Promise.all(
        slots.map(async (slot: MealSlot) => ({
          slot,
          date,
          item: await defaultMenuItemFor(body.goal as Goal, body.dietTypes as DietType[], body.allergens, slot),
        }))
      )
    )
  )

  const price = await planPrice(body.goal as Goal, body.planDuration, body.tier as PlanTier, body.mealsPerDay)
  let promoCodeId: string | undefined
  let discountAmount = 0
  if (body.promoCode) {
    const result = await validatePromoCode(body.promoCode, { goal: body.goal as Goal, tier: body.tier as PlanTier, planDuration: body.planDuration, customerId: req.customerId! }, price)
    if ("error" in result) return res.status(400).json({ error: result.error })
    promoCodeId = result.promoCode.id
    discountAmount = result.discountAmount
  }

  const subscription = await prisma.subscription.create({
    data: {
      customerId: req.customerId!,
      planDuration: body.planDuration,
      startDate,
      mealsPerDay: body.mealsPerDay,
      promoCodeId,
      discountAmount,
      tier: body.tier as PlanTier,
      deliverySlot: body.deliverySlot as never,
      deliveryTimeSlot: body.deliveryTimeSlot as never,
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

  const total = Math.max(0, price - discountAmount)

  // Renewal goes through the same /payments/intent + /payments/confirm chain as initial
  // checkout (see payment.tsx) — that's the only place real-Worldpay-vs-dev-mode is
  // decided, so renewal must not shortcut it with its own auto-succeed logic.
  res.status(201).json({ subscriptionId: subscription.id, total, status: subscription.status })
})
