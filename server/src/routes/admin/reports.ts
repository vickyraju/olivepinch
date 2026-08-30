import { Router } from "express"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { computeEndDate, londonToday } from "../../lib/subscription.js"

export const adminReportsRouter = Router()
adminReportsRouter.use(requireAdminAuth)

// Every section shares one lookback window, driven by the frontend's range selector.
// `null` means "All time" — no lower bound on any of the underlying queries below.
const RANGE_DAYS: Record<string, number | null> = { "7": 7, "30": 30, "90": 90, "180": 180, all: null }
const DEFAULT_RANGE = "180"

function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7)
}

function mondayOf(d: Date): Date {
  const day = d.getUTCDay()
  const start = new Date(d)
  start.setUTCDate(d.getUTCDate() - ((day + 6) % 7))
  return start
}

// FR-A07: reporting on the questions the dashboard/revenue endpoints don't answer — is the
// pilot retaining customers, is the weekly-menu feature used, and what's actually selling
// across the 72-price grid. Same manual Map-bucketing convention as dashboard.ts/revenue.ts.
adminReportsRouter.get("/summary", async (req, res) => {
  const today = londonToday()
  const rangeParam = typeof req.query.range === "string" && req.query.range in RANGE_DAYS ? req.query.range : DEFAULT_RANGE
  const days = RANGE_DAYS[rangeParam]!
  const since = days === null ? null : (() => {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - days)
    return d
  })()

  // --- Renewal rate: for every subscription that has run its course (EXPIRED/CANCELLED),
  // did that customer go on to start another one? The last subscription per customer is
  // excluded while still ACTIVE — no renewal decision has happened yet. Decisions are
  // computed in JS (endDate isn't a stored column), so the range filter is applied after.
  const allSubs = await prisma.subscription.findMany({
    where: { status: { in: ["ACTIVE", "EXPIRED", "CANCELLED"] } },
    select: { customerId: true, startDate: true, planDuration: true, pausedDates: true, status: true },
    orderBy: { startDate: "asc" },
  })
  const byCustomer = new Map<string, typeof allSubs>()
  for (const sub of allSubs) {
    const list = byCustomer.get(sub.customerId) ?? []
    list.push(sub)
    byCustomer.set(sub.customerId, list)
  }
  const renewalBuckets = new Map<string, { renewed: number; total: number }>()
  for (const subs of byCustomer.values()) {
    for (let i = 0; i < subs.length; i++) {
      const sub = subs[i]!
      const isLast = i === subs.length - 1
      if (isLast && sub.status === "ACTIVE") continue // still running, no decision yet
      const endDate = computeEndDate(sub.startDate, sub.planDuration, sub.pausedDates)
      if (since && endDate.getTime() < since.getTime()) continue
      const key = monthKey(endDate)
      const bucket = renewalBuckets.get(key) ?? { renewed: 0, total: 0 }
      bucket.total++
      if (!isLast) bucket.renewed++
      renewalBuckets.set(key, bucket)
    }
  }
  const renewalTrend = [...renewalBuckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => ({ month, renewed: b.renewed, total: b.total, rate: b.total ? b.renewed / b.total : 0 }))

  // --- Menu selection engagement: of orders due in the selected window, what share reflect
  // an explicit customer/admin choice (menuChosenAt) rather than the goal default.
  const orders = await prisma.order.findMany({
    where: { status: { not: "PAUSED" }, deliveryDate: { ...(since ? { gte: since } : {}), lte: today } },
    select: { deliveryDate: true, menuChosenAt: true },
  })
  const engagementBuckets = new Map<string, { chosen: number; total: number }>()
  for (const order of orders) {
    const key = mondayOf(order.deliveryDate).toISOString().slice(0, 10)
    const bucket = engagementBuckets.get(key) ?? { chosen: 0, total: 0 }
    bucket.total++
    if (order.menuChosenAt) bucket.chosen++
    engagementBuckets.set(key, bucket)
  }
  const engagementTrend = [...engagementBuckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, b]) => ({ week, chosen: b.chosen, total: b.total, rate: b.total ? b.chosen / b.total : 0 }))

  // --- Revenue by pricing dimension: the flat total on the dashboard says nothing about
  // which goal/tier/duration/mealsPerDay combination is actually selling.
  const payments = await prisma.payment.findMany({
    where: { status: "succeeded", ...(since ? { paidAt: { gte: since } } : {}), subscriptionId: { not: null } },
    select: {
      amount: true,
      customerId: true,
      subscription: { select: { tier: true, planDuration: true, mealsPerDay: true, customer: { select: { goal: true } } } },
    },
  })
  function sumBy(key: (p: (typeof payments)[number]) => string) {
    const buckets = new Map<string, number>()
    for (const p of payments) {
      const k = key(p)
      buckets.set(k, (buckets.get(k) ?? 0) + Number(p.amount))
    }
    return [...buckets.entries()].map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total)
  }
  const revenueByGoal = sumBy((p) => p.subscription?.customer.goal ?? "Unknown")
  const revenueByTier = sumBy((p) => p.subscription?.tier ?? "Unknown")
  const revenueByDuration = sumBy((p) => `${p.subscription?.planDuration} Days`)
  const revenueByMealsPerDay = sumBy((p) => `${p.subscription?.mealsPerDay} meals/day`)

  // --- Goal split: part-to-whole, not magnitude — how many paying customers are on each
  // goal, not how much they spent. Distinct customers from the same payment set above.
  // Fixed category order (not sorted by count) so a segment's color/position never shifts
  // as the range selection changes which goal happens to be biggest.
  const GOAL_ORDER = ["WEIGHT_LOSS", "MUSCLE_BUILDING", "WEIGHT_MAINTENANCE", "WEIGHT_GAIN", "Unknown"]
  const customerGoalById = new Map<string, string>()
  for (const p of payments) customerGoalById.set(p.customerId, p.subscription?.customer.goal ?? "Unknown")
  const goalCounts = new Map<string, number>()
  for (const goal of customerGoalById.values()) goalCounts.set(goal, (goalCounts.get(goal) ?? 0) + 1)
  const customersByGoal = GOAL_ORDER
    .filter((label) => goalCounts.has(label))
    .map((label) => ({ label, count: goalCounts.get(label)! }))

  // --- Food popularity: what's actually being served, from OrderItem rows in the same window.
  const orderItems = await prisma.orderItem.findMany({
    where: { order: { deliveryDate: { ...(since ? { gte: since } : {}), lte: today } } },
    select: { menuItem: { select: { name: true } } },
  })
  const itemBuckets = new Map<string, number>()
  for (const { menuItem } of orderItems) itemBuckets.set(menuItem.name, (itemBuckets.get(menuItem.name) ?? 0) + 1)
  const menuItemPopularity = [...itemBuckets.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  res.json({ renewalTrend, engagementTrend, revenueByGoal, revenueByTier, revenueByDuration, revenueByMealsPerDay, customersByGoal, menuItemPopularity })
})
