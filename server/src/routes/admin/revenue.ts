import { Router } from "express"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"

export const adminRevenueRouter = Router()
adminRevenueRouter.use(requireAdminAuth)

// FR-A06: revenue reporting (daily/weekly) — CSV export is handled client-side from this JSON,
// same pattern as the rest of the admin panel.
adminRevenueRouter.get("/", async (req, res) => {
  const days = req.query.range === "weekly" ? 90 : 30
  const since = new Date()
  since.setDate(since.getDate() - days)

  const payments = await prisma.payment.findMany({
    where: { status: "succeeded", paidAt: { gte: since } },
    select: { amount: true, paidAt: true },
    orderBy: { paidAt: "asc" },
  })

  const bucketKey = (date: Date) => {
    if (req.query.range === "weekly") {
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      return weekStart.toISOString().slice(0, 10)
    }
    return date.toISOString().slice(0, 10)
  }

  const buckets = new Map<string, number>()
  const step = req.query.range === "weekly" ? 7 : 1
  for (let cursor = new Date(since); cursor <= new Date(); cursor.setDate(cursor.getDate() + step)) {
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
