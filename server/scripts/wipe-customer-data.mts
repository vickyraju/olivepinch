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
  ["Session", () => prisma.session.deleteMany()],
  ["Account", () => prisma.account.deleteMany()],
  ["Verification", () => prisma.verification.deleteMany()],
  ["User", () => prisma.user.deleteMany()],
  ["Lead", () => prisma.lead.deleteMany()],
  ["AdminAuditLog", () => prisma.adminAuditLog.deleteMany()],
]
const counts = {
  PromoRedemption: await prisma.promoRedemption.count(), Payment: await prisma.payment.count(), OrderItem: await prisma.orderItem.count(),
  Order: await prisma.order.count(), Subscription: await prisma.subscription.count(), HealthLog: await prisma.healthLog.count(),
  ConsentLog: await prisma.consentLog.count(), Notification: await prisma.notification.count(), Otp: await prisma.otp.count(),
  Customer: await prisma.customer.count(), Lead: await prisma.lead.count(), AdminAuditLog: await prisma.adminAuditLog.count(),
}
console.log(counts)
console.log("Kept:", { admins: await prisma.adminUser.count(), menuItems: await prisma.menuItem.count(), plans: await prisma.plan.count(), promoCodes: await prisma.promoCode.count() })

if (apply) {
  await prisma.$transaction(steps.map(([, run]) => run()) as never)
  console.log("Wiped (customer data, login users and sessions).")
}
await prisma.$disconnect()
