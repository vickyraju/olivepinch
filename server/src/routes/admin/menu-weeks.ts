import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { validateBody } from "../../middleware/validate.js"
import { assertMonday, applyWeekSelection, weekDates, isWeekComplete } from "../../lib/menu-week.js"
import { londonToday } from "../../lib/subscription.js"
import { formatAddress } from "../../lib/address.js"

export const adminMenuWeeksRouter = Router()
adminMenuWeeksRouter.use(requireAdminAuth)

function logAction(adminId: string, action: string, customerId?: string, detail?: string) {
  return prisma.adminAuditLog.create({ data: { adminId, action, customerId, detail } })
}

// After a week's menu changes (or is deleted), any upcoming customer day whose chosen dish is no
// longer on that day's menu goes back to "Not chosen", so nobody is sent a dish that was taken off.
// Today and past days are never touched (the kitchen has started on them).
async function resetPicksNotOnMenu(weekStart: Date) {
  const today = londonToday()
  const menuWeek = await prisma.menuWeek.findUnique({ where: { weekStart }, include: { items: true } })
  const onMenu = new Set((menuWeek?.items ?? []).map((i) => `${i.date.toISOString().slice(0, 10)}|${i.menuItemId}`))
  const orders = await prisma.order.findMany({
    where: {
      deliveryDate: { in: weekDates(weekStart).filter((d) => d.getTime() > today.getTime()) },
      status: { in: ["SCHEDULED", "PAUSED"] },
      subscription: { status: { in: ["ACTIVE", "PENDING_PAYMENT"] } },
      items: { some: {} },
    },
    include: { items: true, subscription: { select: { customerId: true } } },
  })
  const affected = orders.filter((o) => o.items.some((i) => !onMenu.has(`${o.deliveryDate.toISOString().slice(0, 10)}|${i.menuItemId}`)))
  if (affected.length > 0) {
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId: { in: affected.map((o) => o.id) } } }),
      prisma.order.updateMany({ where: { id: { in: affected.map((o) => o.id) } }, data: { menuChosenAt: null } }),
    ])
  }
  return { resetDays: affected.length, customers: new Set(affected.map((o) => o.subscription.customerId)).size }
}

adminMenuWeeksRouter.get("/", async (_req, res) => {
  const weeks = await prisma.menuWeek.findMany({
    orderBy: { weekStart: "desc" },
    include: { items: { select: { date: true, menuItem: { select: { slot: true } } } } },
  })
  res.json(
    weeks.map((w) => ({
      weekStart: w.weekStart.toISOString().slice(0, 10),
      published: w.published,
      publishedAt: w.publishedAt,
      itemCount: w.items.length,
      complete: isWeekComplete(w.items.map((i) => ({ date: i.date, slot: i.menuItem.slot })), w.weekStart),
    }))
  )
})

adminMenuWeeksRouter.get("/:weekStart", async (req, res) => {
  const weekStart = assertMonday(req.params.weekStart as string)
  const menuWeek = await prisma.menuWeek.findUnique({ where: { weekStart }, include: { items: { include: { menuItem: true } } } })
  if (!menuWeek) {
    return res.json({ weekStart: req.params.weekStart, published: false, publishedAt: null, complete: false, items: [] })
  }
  res.json({
    weekStart: menuWeek.weekStart.toISOString().slice(0, 10),
    published: menuWeek.published,
    publishedAt: menuWeek.publishedAt,
    complete: isWeekComplete(menuWeek.items.map((i) => ({ date: i.date, slot: i.menuItem.slot })), weekStart),
    items: menuWeek.items.map((wi) => ({ ...wi.menuItem, date: wi.date.toISOString().slice(0, 10) })),
  })
})

const putWeekSchema = z.object({
  dayItems: z.array(z.object({ date: z.string(), menuItemIds: z.array(z.string()) })),
})

// Composes a week's per-day menu in one call — upserts the MenuWeek (created unpublished if it
// doesn't exist yet) and replaces its full MenuWeekItem set to match the given per-date lists.
adminMenuWeeksRouter.put("/:weekStart", validateBody(putWeekSchema), async (req, res) => {
  const weekStart = assertMonday(req.params.weekStart as string)
  const { dayItems } = req.body as z.infer<typeof putWeekSchema>

  const validDates = new Set(weekDates(weekStart).map((d) => d.toISOString().slice(0, 10)))
  const rows: { menuItemId: string; date: string }[] = []
  const seenItemIdsByDate = new Map<string, Set<string>>()
  for (const { date, menuItemIds } of dayItems) {
    if (!validDates.has(date)) return res.status(400).json({ error: `${date} is not in this week` })
    const seen = seenItemIdsByDate.get(date) ?? new Set<string>()
    for (const menuItemId of menuItemIds) {
      if (seen.has(menuItemId)) {
        return res.status(400).json({ error: "The same item can't be used twice on the same day" })
      }
      seen.add(menuItemId)
      rows.push({ menuItemId, date })
    }
    seenItemIdsByDate.set(date, seen)
  }

  // Published weeks stay editable (an admin can fix a mistake), but today and past days are frozen:
  // whatever was on those days' menus is kept exactly as it was, whatever the request says.
  const todayIso = londonToday().toISOString().slice(0, 10)
  const menuWeek = await prisma.menuWeek.upsert({
    where: { weekStart },
    create: { weekStart },
    update: {},
  })
  const futureRows = rows.filter((r) => r.date > todayIso)
  await prisma.$transaction([
    prisma.menuWeekItem.deleteMany({ where: { menuWeekId: menuWeek.id, date: { gt: new Date(`${todayIso}T00:00:00.000Z`) } } }),
    prisma.menuWeekItem.createMany({
      data: futureRows.map((r) => ({ menuWeekId: menuWeek.id, menuItemId: r.menuItemId, date: new Date(`${r.date}T00:00:00.000Z`) })),
    }),
  ])
  const reset = menuWeek.published ? await resetPicksNotOnMenu(weekStart) : { resetDays: 0, customers: 0 }
  await logAction(
    req.adminId!,
    "menu-week-compose",
    undefined,
    `week ${req.params.weekStart}, ${futureRows.length} upcoming items${reset.resetDays ? `; reset ${reset.resetDays} customer day(s)` : ""}`
  )
  res.json({ ...reset, pastDaysKept: rows.length !== futureRows.length || weekStart.getTime() <= londonToday().getTime() })
})

// Delete a week's menu (e.g. published by mistake). Only weeks that haven't started: once a day has
// been served or is being prepared, the week is history. Customers who had picked from it go back
// to "Not chosen" for those days.
adminMenuWeeksRouter.delete("/:weekStart", async (req, res) => {
  const weekStart = assertMonday(req.params.weekStart as string)
  if (weekStart.getTime() <= londonToday().getTime()) {
    return res.status(400).json({ error: "This week has already started, so its menu can't be deleted. Edit the upcoming days instead." })
  }
  const menuWeek = await prisma.menuWeek.findUnique({ where: { weekStart } })
  if (!menuWeek) return res.status(404).json({ error: "There's no menu for that week." })
  await prisma.menuWeek.delete({ where: { id: menuWeek.id } }) // its items go with it (cascade)
  const reset = await resetPicksNotOnMenu(weekStart)
  await logAction(req.adminId!, "menu-week-delete", undefined, `week ${req.params.weekStart}${reset.resetDays ? `; reset ${reset.resetDays} customer day(s)` : ""}`)
  res.json(reset)
})

adminMenuWeeksRouter.post("/:weekStart/publish", async (req, res) => {
  const weekStart = assertMonday(req.params.weekStart as string)
  const menuWeek = await prisma.menuWeek.findUnique({ where: { weekStart }, include: { items: { include: { menuItem: true } } } })
  if (!menuWeek) return res.status(404).json({ error: "No menu drafted for that week yet" })
  if (menuWeek.items.length === 0) return res.status(400).json({ error: "Add at least one item before publishing" })
  if (!isWeekComplete(menuWeek.items.map((i) => ({ date: i.date, slot: i.menuItem.slot })), weekStart)) {
    return res.status(400).json({ error: "Every day needs breakfast, lunch, and dinner items before publishing" })
  }

  await prisma.menuWeek.update({ where: { id: menuWeek.id }, data: { published: true, publishedAt: new Date() } })
  await logAction(req.adminId!, "menu-week-publish", undefined, `week ${req.params.weekStart}`)
  res.status(204).send()
})

// How many customer orders already reference each menu item in this week — lets the admin
// see the blast radius of removing/swapping a roster item before doing so. Safe either way:
// OrderItem.menuItemId is set at selection time and independent of the week's roster.
adminMenuWeeksRouter.get("/:weekStart/item-counts", async (req, res) => {
  const weekStart = assertMonday(req.params.weekStart as string)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
  const rows = await prisma.orderItem.groupBy({
    by: ["menuItemId"],
    where: { order: { deliveryDate: { gte: weekStart, lte: weekEnd } } },
    _count: { _all: true },
  })
  res.json(Object.fromEntries(rows.map((r) => [r.menuItemId, r._count._all])))
})

// Customers/subscriptions with at least one delivery in this week whose menu hasn't been
// explicitly chosen yet (still on the goal/diet default) — the list an admin works through
// after the Friday cutoff for anyone who didn't pick in time.
adminMenuWeeksRouter.get("/:weekStart/pending", async (req, res) => {
  const weekStart = assertMonday(req.params.weekStart as string)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)

  const orders = await prisma.order.findMany({
    where: {
      deliveryDate: { gte: weekStart, lte: weekEnd },
      menuChosenAt: null,
      subscription: { status: "ACTIVE" },
    },
    include: {
      subscription: {
        include: {
          customer: {
            select: {
              id: true, fullName: true, email: true, phone: true, postcode: true,
              addressDoorNumber: true, addressBuildingName: true, addressStreet: true, addressArea: true, addressPostcode: true,
            },
          },
        },
      },
    },
    orderBy: { deliveryDate: "asc" },
  })

  const bySubscription = new Map<
    string,
    { subscriptionId: string; customer: { id: string; fullName: string; email: string | null; phone: string | null; address: string | null }; mealsPerDay: number; missingDates: string[] }
  >()
  for (const order of orders) {
    const key = order.subscriptionId
    const date = order.deliveryDate.toISOString().slice(0, 10)
    const entry = bySubscription.get(key)
    if (entry) entry.missingDates.push(date)
    else {
      const { id, fullName, email, phone, ...addressFields } = order.subscription.customer
      bySubscription.set(key, {
        subscriptionId: key,
        customer: { id, fullName, email, phone, address: formatAddress(addressFields) },
        mealsPerDay: order.subscription.mealsPerDay,
        missingDates: [date],
      })
    }
  }
  res.json([...bySubscription.values()])
})

const overrideSchema = z.object({
  dayItems: z.array(z.object({ date: z.string(), items: z.array(z.string()) })),
})

// Admin sets a customer's week manually (e.g. after calling them post-cutoff) — same
// selection logic as the customer-facing endpoint, just without the cutoff check.
adminMenuWeeksRouter.patch("/:weekStart/subscriptions/:subscriptionId", validateBody(overrideSchema), async (req, res) => {
  const weekStart = assertMonday(req.params.weekStart as string)
  const { dayItems } = req.body as z.infer<typeof overrideSchema>
  await applyWeekSelection(req.params.subscriptionId as string, weekStart, dayItems)
  await logAction(req.adminId!, "menu-week-override", req.params.subscriptionId as string, `week ${req.params.weekStart}`)
  res.status(204).send()
})
