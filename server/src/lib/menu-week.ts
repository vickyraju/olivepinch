import { prisma } from "./prisma.js"
import { SLOTS_BY_MEALS_PER_DAY } from "./pricing.js"
import type { MealSlot } from "@prisma/client"

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status })
}

export function assertMonday(dateIso: string): Date {
  const date = new Date(`${dateIso}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) throw httpError(400, "Invalid week date")
  if (date.getUTCDay() !== 1) throw httpError(400, "Week must start on a Monday")
  return date
}

// Selection for the week starting `weekStart` opens the Wednesday before and closes Saturday
// 00:00 UK of the week before (i.e. Friday end of day) — admin publishes by Tuesday night (a
// soft target, not enforced here) so customers can choose Wed–Fri ahead of that week.
// ponytail: UK time treated as UTC (no DST handling), matching the rest of this file.
export function fridayCutoffFor(weekStart: Date): Date {
  const cutoff = new Date(weekStart)
  cutoff.setUTCDate(cutoff.getUTCDate() - 2)
  return cutoff
}

// Once customer choosing opens (Wednesday before weekStart, i.e. fridayCutoffFor - 3 days /
// weekStart - 5 days), a published week's roster is frozen — no more admin edits, so nobody's
// already-made choice can ever be swapped out from under them by a later roster change.
export function publishEditLockFor(weekStart: Date): Date {
  const lock = new Date(weekStart)
  lock.setUTCDate(lock.getUTCDate() - 5)
  return lock
}

// Slots every subscription needs regardless of mealsPerDay (the union of SLOTS_BY_MEALS_PER_DAY)
// — SNACKS is never a required slot, so a week can publish without it.
const REQUIRED_SLOTS: MealSlot[] = ["BREAKFAST", "LUNCH", "DINNER"]

// A week only counts as usable once every one of its 7 days has all required slots covered —
// otherwise customers whose delivery falls on a thin day can't complete their selection.
export function isWeekComplete(items: { date: Date; slot: MealSlot }[], weekStart: Date): boolean {
  const slotsByDate = new Map<string, Set<MealSlot>>()
  for (const item of items) {
    const dateIso = item.date.toISOString().slice(0, 10)
    if (!slotsByDate.has(dateIso)) slotsByDate.set(dateIso, new Set())
    slotsByDate.get(dateIso)!.add(item.slot)
  }
  return weekDates(weekStart).every((d) => {
    const slots = slotsByDate.get(d.toISOString().slice(0, 10))
    return !!slots && REQUIRED_SLOTS.every((s) => slots.has(s))
  })
}

export function weekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setUTCDate(d.getUTCDate() + i)
    return d
  })
}

export interface WeekDaySelection {
  date: string // YYYY-MM-DD
  items: string[] // menuItem ids, positionally matched to SLOTS_BY_MEALS_PER_DAY[mealsPerDay]
}

// Shared by the customer-facing and admin-override endpoints — they differ only in whether
// the Friday cutoff is enforced (checked by the caller) and how the change gets logged.
export async function applyWeekSelection(subscriptionId: string, weekStart: Date, dayItems: WeekDaySelection[]) {
  const subscription = await prisma.subscription.findUniqueOrThrow({ where: { id: subscriptionId } })
  const slots = SLOTS_BY_MEALS_PER_DAY[subscription.mealsPerDay as 1 | 2 | 3]

  const menuWeek = await prisma.menuWeek.findUnique({ where: { weekStart }, include: { items: { include: { menuItem: true } } } })
  if (!menuWeek || !menuWeek.published) {
    throw httpError(400, "No published menu for that week yet")
  }
  // Items are scoped to the specific date they're served on, not the whole week.
  const availableByDate = new Map<string, Map<string, (typeof menuWeek.items)[number]["menuItem"]>>()
  for (const wi of menuWeek.items) {
    const dateIso = wi.date.toISOString().slice(0, 10)
    if (!availableByDate.has(dateIso)) availableByDate.set(dateIso, new Map())
    availableByDate.get(dateIso)!.set(wi.menuItemId, wi.menuItem)
  }

  // Only the days that actually belong to this subscription within the week (a plan can
  // start or end mid-week, so not every one of the 7 calendar days necessarily has an Order).
  const orders = await prisma.order.findMany({
    where: { subscriptionId, deliveryDate: { in: weekDates(weekStart) } },
  })
  if (orders.length === 0) throw httpError(400, "This subscription has no deliveries in that week")

  const byDate = new Map(dayItems.map((d) => [d.date, d.items]))

  const updates = orders.map((order) => {
    const date = order.deliveryDate.toISOString().slice(0, 10)
    const itemIds = byDate.get(date)
    if (!itemIds || itemIds.length !== slots.length) {
      throw httpError(400, `Missing menu selection for ${date}`)
    }
    const items = itemIds.map((id, i) => {
      const item = availableByDate.get(date)?.get(id)
      if (!item || item.slot !== slots[i]) {
        throw httpError(400, `Invalid menu selection for ${date} (${slots[i]})`)
      }
      return { menuItemId: item.id, slot: item.slot as MealSlot }
    })
    return { orderId: order.id, items }
  })

  await prisma.$transaction(
    updates.flatMap(({ orderId, items }) => [
      prisma.orderItem.deleteMany({ where: { orderId } }),
      prisma.orderItem.createMany({ data: items.map((i) => ({ orderId, menuItemId: i.menuItemId, slot: i.slot })) }),
      prisma.order.update({ where: { id: orderId }, data: { menuChosenAt: new Date() } }),
    ])
  )
}
