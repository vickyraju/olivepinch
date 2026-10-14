// One-off pre-launch reset: removes everything customers generated (accounts, plans, orders,
// payments, health logs, leads, notifications, audit log) and their Supabase login accounts.
// Keeps the catalogue and config: menu items/weeks, plans, promo codes, zones, delivery slots,
// allergens and admin users.
// Usage: npx tsx --env-file=.env scripts/wipe-customer-data.mts [--apply]   (from server/)
import { prisma } from "../src/lib/prisma.js"

const apply = process.argv.includes("--apply")
const steps: [string, () => Promise<{ count: number }>][] = [
  ["PromoRedemption", () => prisma.promoRedemption.deleteMany()],
  ["Payment", () => prisma.payment.deleteMany()],
  ["OrderItem", () => prisma.orderItem.deleteMany()],
  ["Order", () => prisma.order.deleteMany()],
  ["Subscription", () => prisma.subscription.deleteMany()],
  ["HealthLog", () => prisma.healthLog.deleteMany()],
  ["ConsentLog", () => prisma.consentLog.deleteMany()],
  ["Notification", () => prisma.notification.deleteMany()],
  ["Otp", () => prisma.otp.deleteMany()],
  ["Customer", () => prisma.customer.deleteMany()],
  ["Lead", () => prisma.lead.deleteMany()],
  ["AdminAuditLog", () => prisma.adminAuditLog.deleteMany()],
]
const counts = {
  PromoRedemption: await prisma.promoRedemption.count(), Payment: await prisma.payment.count(), OrderItem: await prisma.orderItem.count(),
  Order: await prisma.order.count(), Subscription: await prisma.subscription.count(), HealthLog: await prisma.healthLog.count(),
  ConsentLog: await prisma.consentLog.count(), Notification: await prisma.notification.count(), Otp: await prisma.otp.count(),
  Customer: await prisma.customer.count(), Lead: await prisma.lead.count(), AdminAuditLog: await prisma.adminAuditLog.count(),
}
const authIds = (await prisma.customer.findMany({ where: { supabaseUserId: { not: null } }, select: { supabaseUserId: true } })).map((c) => c.supabaseUserId!)
console.log(counts, `\nSupabase login accounts linked to customers: ${authIds.length}`)
console.log("Kept:", { admins: await prisma.adminUser.count(), menuItems: await prisma.menuItem.count(), plans: await prisma.plan.count(), promoCodes: await prisma.promoCode.count() })

if (apply) {
  await prisma.$transaction(steps.map(([, run]) => run()) as never)
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  let removed = 0
  for (const id of authIds) {
    const r = await fetch(`${url}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: { apikey: key!, Authorization: `Bearer ${key}` } })
    if (r.ok) removed++
    else console.log("auth delete failed", r.status)
  }
  console.log(`Wiped. Removed ${removed}/${authIds.length} Supabase login accounts.`)
}
await prisma.$disconnect()
