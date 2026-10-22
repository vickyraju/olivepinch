import type { Prisma } from "@prisma/client"
import { prisma } from "./prisma.js"

type PlanFields = Omit<Prisma.SubscriptionUncheckedCreateInput, "customerId" | "status" | "orders" | "id" | "createdAt">

// A customer has at most one unpaid plan. Retrying after a decline, a closed payment page or a change of mind updates that
// same plan instead of creating another, so every payment attempt (even an old one Worldpay did take money for) maps to the
// one subscription and activates it. It becomes a real plan only when a payment succeeds.
export async function saveUnpaidPlan(customerId: string, fields: PlanFields, orders: Prisma.OrderCreateWithoutSubscriptionInput[]) {
  const include = { orders: { include: { items: { include: { menuItem: true } } } } } as const
  const existing = await prisma.subscription.findFirst({ where: { customerId, status: "PENDING_PAYMENT" }, orderBy: { createdAt: "desc" } })
  if (!existing) {
    return prisma.subscription.create({ data: { ...fields, customerId, status: "PENDING_PAYMENT", orders: { create: orders } }, include })
  }
  const [, , updated] = await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { order: { subscriptionId: existing.id } } }),
    prisma.order.deleteMany({ where: { subscriptionId: existing.id } }),
    prisma.subscription.update({
      where: { id: existing.id },
      data: { ...(fields as Prisma.SubscriptionUncheckedUpdateInput), orders: { create: orders } },
      include,
    }),
  ])
  return updated
}
