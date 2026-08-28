import { Router, type Request } from "express"
import { prisma } from "../lib/prisma.js"
import { sendEmail } from "../lib/email.js"
import { renewalReminderEmail, lapsedRetentionEmail, accountRecoveryEmail, weeklyMenuSelectionEmail } from "../lib/email-templates.js"
import { computeEndDate, addDays, londonToday } from "../lib/subscription.js"
import { weekDates } from "../lib/menu-week.js"

export const internalRouter = Router()

// FR-C26: customers who paid but never finished identity verification. Swept periodically
// (see vercel.json's cron entry) rather than sent immediately at payment time, since the
// customer may still come back and finish on their own. No signed token needed here —
// Firebase's own OTP is what actually proves identity when they get to /login, this link
// just gets them there with the phone number prefilled. Email is optional contact info now,
// so this is a best-effort nudge — customers with no email on file are simply skipped.
export async function runRecoverySweep() {
  const candidates = await prisma.customer.findMany({
    where: {
      accountStatus: "PROVISIONAL",
      payments: { some: { status: "succeeded" } },
      notifications: { none: { message: { startsWith: "recovery:" } } },
    },
  })

  let swept = 0
  for (const customer of candidates) {
    if (!customer.email) continue
    const link = `${process.env.APP_URL ?? "http://localhost:5173"}/login?phone=${encodeURIComponent(customer.phone)}`
    const { subject, text, html } = accountRecoveryEmail({ name: customer.fullName, link })
    await sendEmail(customer.email, subject, text, html)
    await prisma.notification.create({
      data: { customerId: customer.id, channel: "email", message: `recovery: sent to ${customer.email}`, status: "sent", sentAt: new Date() },
    })
    swept++
  }

  return { swept }
}

// Reminder timing per plan length, days before the plan's end date.
const REMINDER_OFFSET_DAYS: Record<number, number> = { 7: 2, 14: 4, 28: 7 }

export async function runRenewalReminderSweep() {
  const active = await prisma.subscription.findMany({
    where: { status: "ACTIVE" },
    include: { customer: true },
  })

  const today = londonToday()

  let sent = 0
  for (const sub of active) {
    const offset = REMINDER_OFFSET_DAYS[sub.planDuration]
    if (!offset) continue

    const endDate = computeEndDate(sub.startDate, sub.planDuration, sub.pausedDates)
    const reminderDate = addDays(endDate, -offset)
    if (reminderDate.getTime() !== today.getTime()) continue

    const message = `renewal-reminder:${sub.id}`
    const already = await prisma.notification.findFirst({ where: { customerId: sub.customerId, message } })
    if (already) continue
    if (!sub.customer.email) continue

    try {
      const { subject, text, html } = renewalReminderEmail({
        name: sub.customer.fullName,
        endDate: endDate.toISOString().slice(0, 10),
        planDuration: sub.planDuration,
        dashboardUrl: `${process.env.APP_URL ?? "http://localhost:5173"}/dashboard/subscription`,
      })
      await sendEmail(sub.customer.email, subject, text, html)
      await prisma.notification.create({
        data: { customerId: sub.customerId, channel: "email", message, status: "sent", sentAt: new Date() },
      })
      sent++
    } catch (err) {
      console.error("renewal reminder email failed", sub.id, err)
    }
  }

  return { sent }
}

// Nothing else ever revisits a subscription's status once it's ACTIVE — without this, EXPIRED
// is dead code everywhere it's read (dashboard, firstSubscriptionOnly promo check, admin views).
export async function runExpirySweep() {
  const active = await prisma.subscription.findMany({ where: { status: "ACTIVE" } })

  const today = londonToday()

  let expired = 0
  for (const sub of active) {
    const endDate = computeEndDate(sub.startDate, sub.planDuration, sub.pausedDates)
    if (endDate.getTime() >= today.getTime()) continue
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: "EXPIRED" } })
    expired++
  }

  return { expired }
}

// GDPR storage-limitation check: a customer whose most recent plan lapsed 12+ months ago with
// no renewal has no other reason for us to keep holding their (special-category) health data.
// This only nudges them toward the self-service export/delete flow on the Privacy page — it
// never deletes anything automatically.
const RETENTION_MONTHS = 12

export async function runLapsedRetentionSweep() {
  const customers = await prisma.customer.findMany({
    where: { accountStatus: "ACTIVE" },
    include: { subscriptions: { orderBy: { startDate: "desc" }, take: 1 } },
  })

  const cutoff = londonToday()
  cutoff.setUTCMonth(cutoff.getUTCMonth() - RETENTION_MONTHS)

  let sent = 0
  for (const customer of customers) {
    const latest = customer.subscriptions[0]
    if (!latest || latest.status !== "EXPIRED") continue
    if (!customer.email) continue

    const endDate = computeEndDate(latest.startDate, latest.planDuration, latest.pausedDates)
    if (endDate.getTime() > cutoff.getTime()) continue

    const message = `lapsed-retention:${customer.id}`
    const already = await prisma.notification.findFirst({ where: { customerId: customer.id, message } })
    if (already) continue

    try {
      const { subject, text, html } = lapsedRetentionEmail({
        name: customer.fullName,
        dashboardUrl: `${process.env.APP_URL ?? "http://localhost:5173"}/dashboard/subscription`,
        privacyUrl: `${process.env.APP_URL ?? "http://localhost:5173"}/dashboard/privacy`,
      })
      await sendEmail(customer.email, subject, text, html)
      await prisma.notification.create({
        data: { customerId: customer.id, channel: "email", message, status: "sent", sentAt: new Date() },
      })
      sent++
    } catch (err) {
      console.error("lapsed retention email failed", customer.id, err)
    }
  }

  return { sent }
}

// The one email that isn't a confirmation of something already done — without it the menu
// selection window (subscriptions.ts PATCH /:id/menu-weeks/:weekStart) has no trigger at all,
// and customers silently fall through to the goal-matched defaults every week.
export async function runMenuSelectionSweep() {
  // Selection opens the Wednesday before, i.e. weekStart - 5 days. Deriving weekStart from
  // today and bailing unless it's a Monday means this is a no-op on the other six days.
  const weekStart = addDays(londonToday(), 5)
  if (weekStart.getUTCDay() !== 1) return { sent: 0 }

  const menuWeek = await prisma.menuWeek.findUnique({ where: { weekStart } })
  if (!menuWeek || !menuWeek.published) return { sent: 0 }

  const orders = await prisma.order.findMany({
    where: {
      deliveryDate: { in: weekDates(weekStart) },
      menuChosenAt: null,
      subscription: { status: "ACTIVE" },
    },
    include: { subscription: { include: { customer: true } } },
  })

  // A subscription has up to 7 unchosen orders in the week — one email covers all of them.
  const bySubscription = new Map<string, (typeof orders)[number]>()
  for (const order of orders) bySubscription.set(order.subscriptionId, order)

  const weekStartIso = weekStart.toISOString().slice(0, 10)
  let sent = 0
  for (const order of bySubscription.values()) {
    const { customer } = order.subscription
    if (!customer.email) continue

    const message = `menu-selection:${order.subscriptionId}:${weekStartIso}`
    const already = await prisma.notification.findFirst({ where: { customerId: customer.id, message } })
    if (already) continue

    try {
      const { subject, text, html } = weeklyMenuSelectionEmail({
        name: customer.fullName,
        weekStart: weekStartIso,
        // The window shuts at Saturday 00:00 UK, so the last day they can actually choose
        // on is the Friday — that's the date worth putting in front of them, not the instant.
        cutoffDate: addDays(weekStart, -3).toISOString().slice(0, 10),
        dashboardUrl: `${process.env.APP_URL ?? "http://localhost:5173"}/dashboard/weekly-menu`,
      })
      await sendEmail(customer.email, subject, text, html)
      await prisma.notification.create({
        data: { customerId: customer.id, channel: "email", message, status: "sent", sentAt: new Date() },
      })
      sent++
    } catch (err) {
      console.error("menu selection email failed", order.subscriptionId, err)
    }
  }

  return { sent }
}

// Returns a [status, message] pair when unauthorized, null when the request may proceed.
// Fails closed: without CRON_SECRET configured, cron endpoints refuse to run rather than
// being open to anyone on the internet.
function checkCronSecret(req: Request): [number, string] | null {
  const secret = process.env.CRON_SECRET
  if (!secret) return [501, "CRON_SECRET is not configured"]
  if (req.headers.authorization !== `Bearer ${secret}`) return [401, "Invalid cron secret"]
  return null
}

// Cron-only endpoints — no admin login involved (nothing to click), gated by a shared secret instead.
internalRouter.post("/recovery-sweep", async (req, res) => {
  const unauthorized = checkCronSecret(req)
  if (unauthorized) return res.status(unauthorized[0]).json({ error: unauthorized[1] })
  res.json(await runRecoverySweep())
})

// Combined sweep — the one endpoint the actual cron job hits daily. Runs the (previously
// untriggered) recovery sweep alongside the new renewal-reminder check in one call, so only
// one cron job is needed. /recovery-sweep stays in place too, unused but harmless.
internalRouter.post("/daily-sweep", async (req, res) => {
  const unauthorized = checkCronSecret(req)
  if (unauthorized) return res.status(unauthorized[0]).json({ error: unauthorized[1] })
  const [recovery, renewalReminders, expiry, lapsedRetention, menuSelection] = await Promise.all([
    runRecoverySweep(),
    runRenewalReminderSweep(),
    runExpirySweep(),
    runLapsedRetentionSweep(),
    runMenuSelectionSweep(),
  ])
  res.json({ recovery, renewalReminders, expiry, lapsedRetention, menuSelection })
})
