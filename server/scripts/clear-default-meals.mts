// One-off: no meal is a "default" any more, so empty future orders nobody has chosen for whose meals
// aren't on that day's published menu (those can only be old goal/diet defaults).
// Usage: npx tsx --env-file=.env scripts/clear-default-meals.mts [--apply]   (from server/)
import { prisma } from "../src/lib/prisma.js"
import { londonToday } from "../src/lib/subscription.js"

const apply = process.argv.includes("--apply")
const orders = await prisma.order.findMany({
  where: { deliveryDate: { gt: londonToday() }, menuChosenAt: null, status: { in: ["SCHEDULED", "PAUSED"] }, items: { some: {} } },
  include: { items: true, subscription: { select: { customer: { select: { fullName: true } } } } },
})
const onMenu = new Set(
  (await prisma.menuWeekItem.findMany({ where: { menuWeek: { published: true } }, select: { date: true, menuItemId: true } })).map(
    (i) => `${i.date.toISOString().slice(0, 10)}|${i.menuItemId}`
  )
)
const stale = orders.filter((o) => o.items.some((i) => !onMenu.has(`${o.deliveryDate.toISOString().slice(0, 10)}|${i.menuItemId}`)))
console.log(`${stale.length} of ${orders.length} unchosen future orders hold meals that aren't on that day's published menu`)
for (const o of stale.slice(0, 15)) console.log(" ", o.subscription.customer.fullName, o.deliveryDate.toISOString().slice(0, 10))
if (apply && stale.length) {
  const r = await prisma.orderItem.deleteMany({ where: { orderId: { in: stale.map((o) => o.id) } } })
  console.log(`Cleared ${r.count} order items`)
}
await prisma.$disconnect()
