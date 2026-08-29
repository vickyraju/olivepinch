import { Router } from "express"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { londonToday } from "../../lib/subscription.js"

export const adminRevenueRouter = Router()
adminRevenueRouter.use(requireAdminAuth)

// FR-A06: revenue reporting (daily/weekly) — CSV export is handled client-side from this JSON,
// same pattern as the rest of the admin panel.
adminRevenueRouter.get("/", async (req, res) => {
  const days = req.query.range === "weekly" ? 90 : 30
  const today = londonToday()
  const since = new Date(today)
  since.setUTCDate(since.getUTCDate() - days)

  const payments = await prisma.payment.findMany({
    where: { status: "succeeded", paidAt: { gte: since } },
    select: { amount: true, paidAt: true },
    orderBy: { paidAt: "asc" },
  })

  // Bucketed by the London calendar day the payment landed on, not the host server's own
  // timezone — a payment at 00:30 BST is "today" for a UK customer even in UTC it's still
  // yesterday, and this codebase's dates are otherwise always London-relative.
  const bucketKey = (instant: Date) => {
    const day = londonToday(instant)
    if (req.query.range === "weekly") {
      const weekStart = new Date(day)
      weekStart.setUTCDate(day.getUTCDate() - day.getUTCDay())
      return weekStart.toISOString().slice(0, 10)
    }
    return day.toISOString().slice(0, 10)
  }

  const buckets = new Map<string, number>()
  const step = req.query.range === "weekly" ? 7 : 1
  for (let cursor = new Date(since); cursor <= today; cursor.setUTCDate(cursor.getUTCDate() + step)) {
    buckets.set(bucketKey(cursor), 0)
  }
  for (const payment of payments) {
    const key = bucketKey(payment.paidAt!)
    buckets.set(key, (buckets.get(key) ?? 0) + Number(payment.amount))
  }

  const series = [...buckets.entries()].map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date))
  const grandTotal = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  res.json({ series, grandTotal, paymentCount: payments.length })
})
