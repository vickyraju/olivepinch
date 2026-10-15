import { Router } from "express"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { computeEndDate, londonToday, addDays } from "../../lib/subscription.js"

export const adminDashboardRouter = Router()
adminDashboardRouter.use(requireAdminAuth)

// Customer self-service changes an admin should be told about on the dashboard (the rest, such as
// pauses and menu picks, are routine and only appear in the customer's own activity list).
const PROFILE_ACTIONS = ["address-changed", "marketing-opt-in"]

// Unseen profile changes, oldest first, until an admin opens them. Not a history: seen ones drop off.
adminDashboardRouter.get("/customer-changes", async (_req, res) => {
  const rows = await prisma.customerActivity.findMany({
    where: { action: { in: PROFILE_ACTIONS }, adminSeenAt: null },
    include: { customer: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  })
  res.json(rows.map((r) => ({ id: r.id, customerId: r.customer.id, customerName: r.customer.fullName, action: r.action, detail: r.detail, createdAt: r.createdAt })))
})

adminDashboardRouter.post("/customer-changes/seen-all", async (_req, res) => {
  await prisma.customerActivity.updateMany({ where: { action: { in: PROFILE_ACTIONS }, adminSeenAt: null }, data: { adminSeenAt: new Date() } })
  res.status(204).send()
})

adminDashboardRouter.post("/customer-changes/:id/seen", async (req, res) => {
  await prisma.customerActivity.updateMany({ where: { id: req.params.id as string, adminSeenAt: null }, data: { adminSeenAt: new Date() } })
  res.status(204).send()
})

function bucketBy<T>(rows: T[], key: (row: T) => string): { status: string; count: number }[] {
  const buckets = new Map<string, number>()
  for (const row of rows) {
    const k = key(row)
    buckets.set(k, (buckets.get(k) ?? 0) + 1)
  }
  return [...buckets.entries()].map(([status, count]) => ({ status, count }))
}

// Single-payload dashboard summary — one round trip rather than one endpoint per widget.
// Every aggregation here is manual Map-bucketing over a narrow-select findMany, matching
// this codebase's existing convention in revenue.ts (no Prisma groupBy/aggregate).
adminDashboardRouter.get("/summary", async (_req, res) => {
  const today = londonToday()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    newCustomersThisWeek,
    accountStatusRows,
    subscriptionStatusRows,
    activeSubscriptions,
    zoneCustomers,
    activeZones,
    paymentRows,
    auditLogs,
  ] = await Promise.all([
    prisma.customer.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.customer.findMany({ select: { accountStatus: true } }),
    prisma.subscription.findMany({ select: { status: true, planDuration: true } }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      include: { customer: { select: { id: true, fullName: true } } },
    }),
    prisma.customer.findMany({ where: { accountStatus: { not: "DELETED" } }, select: { postcode: true } }),
    prisma.zone.findMany({ where: { isActive: true } }),
    prisma.payment.findMany({ select: { status: true } }),
    prisma.adminAuditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { admin: { select: { name: true } } },
    }),
  ])

  // Customers whose plan ends within the next 14 days — lets admins get ahead of renewals
  // instead of finding out the day it lapses. Reuses the same endDate math as the renewal
  // reminder sweep (lib/subscription.ts) rather than storing a separate endDate column.
  const renewalWindowEnd = addDays(today, 14)
  const upcomingRenewals = activeSubscriptions
    .map((sub) => ({
      customerId: sub.customer.id,
      customerName: sub.customer.fullName,
      endDate: computeEndDate(sub.startDate, sub.planDuration, sub.pausedDates),
    }))
    .filter((r) => r.endDate <= renewalWindowEnd)
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
    .map((r) => ({ ...r, endDate: r.endDate.toISOString().slice(0, 10) }))

  // Zone distribution — replicates postcode.ts's area-matching offline (no external API
  // calls per customer; isPostcodeInActiveZone hits postcodes.io and would mean dozens of
  // outbound requests on every dashboard load).
  const zoneBuckets = new Map<string, number>()
  for (const { postcode } of zoneCustomers) {
    const normalized = postcode?.trim().toUpperCase().replace(/\s+/g, "") ?? ""
    const zone = activeZones.find((z) => z.postcodePrefixes.some((prefix) => normalized.startsWith(prefix)))
    const key = zone?.name ?? "Unzoned"
    zoneBuckets.set(key, (zoneBuckets.get(key) ?? 0) + 1)
  }

  const paymentBuckets = new Map<string, number>()
  for (const { status } of paymentRows) paymentBuckets.set(status, (paymentBuckets.get(status) ?? 0) + 1)
  const succeeded = paymentBuckets.get("succeeded") ?? 0
  const refunded = paymentBuckets.get("refunded") ?? 0
  const refundRate = succeeded + refunded > 0 ? refunded / (succeeded + refunded) : 0

  const customerIds = [...new Set(auditLogs.map((l) => l.customerId).filter((id): id is string => !!id))]
  const customers = customerIds.length
    ? await prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, fullName: true } })
    : []
  const customerNameById = new Map(customers.map((c) => [c.id, c.fullName]))

  res.json({
    newCustomersThisWeek,
    accountStatusBreakdown: bucketBy(accountStatusRows, (r) => r.accountStatus),
    subscriptionStatusBreakdown: bucketBy(subscriptionStatusRows, (r) => r.status),
    subscriptionDurationBreakdown: bucketBy(subscriptionStatusRows, (r) => `${r.planDuration} Days`)
      .sort((a, b) => parseInt(a.status) - parseInt(b.status)),
    upcomingRenewals,
    zoneDistribution: [...zoneBuckets.entries()].map(([zone, count]) => ({ zone, count })),
    refunds: { succeeded, refunded, refundRate },
    recentActivity: auditLogs.map((l) => ({
      id: l.id,
      action: l.action,
      detail: l.detail,
      createdAt: l.createdAt,
      adminName: l.admin.name,
      customerId: l.customerId,
      customerName: l.customerId ? (customerNameById.get(l.customerId) ?? null) : null,
    })),
  })
})
