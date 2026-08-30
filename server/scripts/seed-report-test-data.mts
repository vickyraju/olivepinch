// Backdated test data for exercising the Reports date-range selector — without it, every
// range shows identical numbers because this pilot's real data is all <7 days old.
//
// Every row created here belongs to a Customer whose email starts with "test-report-", so
// cleanup is one command and cascades (schema onDelete: Cascade) through subscriptions,
// orders, order items, and payments automatically.
//
// Usage (from server/):
//   npx tsx scripts/seed-report-test-data.mts          # create
//   npx tsx scripts/seed-report-test-data.mts --cleanup # remove everything this script made
import { PrismaClient } from "@prisma/client"
import { fileURLToPath } from "node:url"

process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)))
const prisma = new PrismaClient()

const TEST_EMAIL_PREFIX = "test-report-"

if (process.argv.includes("--cleanup")) {
  const { count } = await prisma.customer.deleteMany({ where: { email: { startsWith: TEST_EMAIL_PREFIX } } })
  console.log(`Deleted ${count} test customer(s) and everything cascaded from them.`)
  await prisma.$disconnect()
  process.exit(0)
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - n)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

const menuItems = await prisma.menuItem.findMany({ take: 4 })
if (menuItems.length < 2) throw new Error("Need at least 2 menu items seeded before running this script")

// One customer/subscription-history scenario per row: staggered start dates land in
// different range buckets (7d/30d/90d/180d), so switching ranges visibly changes the charts.
const SCENARIOS = [
  { goal: "WEIGHT_LOSS", startDaysAgo: 150, planDuration: 7, renews: 2, price: 49.99 }, // oldest activity, only visible past 90d
  { goal: "MUSCLE_BUILDING", startDaysAgo: 45, planDuration: 28, renews: 1, price: 179.99 }, // visible past 30d, not past 7d
  { goal: "WEIGHT_MAINTENANCE", startDaysAgo: 20, planDuration: 7, renews: 1, price: 49.99 }, // visible past 7d in later cycles
  { goal: "WEIGHT_GAIN", startDaysAgo: 5, planDuration: 14, renews: 0, price: 99.99 }, // still active, no decision yet
] as const

let customerNum = 0
for (const scenario of SCENARIOS) {
  customerNum++
  const customer = await prisma.customer.create({
    data: {
      fullName: `TEST Report Customer ${customerNum}`,
      email: `${TEST_EMAIL_PREFIX}${customerNum}@olivepinch.test`,
      phone: `+4470000000${customerNum}`,
      goal: scenario.goal as never,
      accountStatus: "ACTIVE",
    },
  })

  let cycleStart = daysAgo(scenario.startDaysAgo)
  const cycles = scenario.renews + 1
  for (let cycle = 0; cycle < cycles; cycle++) {
    const isLastCycle = cycle === cycles - 1
    const subscription = await prisma.subscription.create({
      data: {
        customerId: customer.id,
        planDuration: scenario.planDuration,
        startDate: cycleStart,
        mealsPerDay: 2,
        tier: "BASIC",
        status: isLastCycle && scenario.renews === 0 ? "ACTIVE" : "EXPIRED",
      },
    })
    await prisma.payment.create({
      data: {
        customerId: customer.id,
        subscriptionId: subscription.id,
        amount: scenario.price,
        status: "succeeded",
        paidAt: cycleStart,
      },
    })

    // A handful of orders through the cycle so menu-engagement and meal-popularity have
    // something to bucket — half get menuChosenAt set, to contrast with production's real 0%.
    const orderDays = Math.min(scenario.planDuration, 7)
    for (let d = 0; d < orderDays; d++) {
      const deliveryDate = addDays(cycleStart, d)
      if (deliveryDate.getTime() > Date.now()) break
      const order = await prisma.order.create({
        data: {
          subscriptionId: subscription.id,
          deliveryDate,
          status: "DELIVERED",
          menuChosenAt: d % 2 === 0 ? deliveryDate : null,
        },
      })
      const item = menuItems[d % menuItems.length]!
      await prisma.orderItem.create({ data: { orderId: order.id, menuItemId: item.id, slot: item.slot } })
    }

    cycleStart = addDays(cycleStart, scenario.planDuration)
  }
}

console.log(`Seeded ${SCENARIOS.length} test customers with backdated subscriptions/payments/orders.`)
console.log(`Run with --cleanup to remove them.`)
await prisma.$disconnect()
