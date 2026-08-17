import { Router, type Request } from "express"
import { prisma } from "../lib/prisma.js"
import { sendEmail } from "../lib/email.js"
import { renewalReminderEmail } from "../lib/email-templates.js"
import { computeEndDate, addDays } from "../lib/subscription.js"

export const internalRouter = Router()

// FR-C26: customers who paid but never finished identity verification. Swept periodically
// (see vercel.json's cron entry) rather than sent immediately at payment time, since the
// customer may still come back and finish on their own. No signed token needed here —
// Supabase's own OTP is what actually proves identity when they get to /login, this link
// just gets them there with the email prefilled.
export async function runRecoverySweep() {
  const candidates = await prisma.customer.findMany({
    where: {
      accountStatus: "PROVISIONAL",
      payments: { some: { status: "succeeded" } },
      notifications: { none: { message: { startsWith: "recovery:" } } },
    },
  })

  for (const customer of candidates) {
    const link = `${process.env.APP_URL ?? "http://localhost:5173"}/login?email=${encodeURIComponent(customer.email)}`
    await sendEmail(
      customer.email,
      "Finish setting up your OlivePinch account",
      `Your payment went through, but your account isn't fully set up yet. Finish here: ${link}`
    )
    await prisma.notification.create({
      data: { customerId: customer.id, channel: "email", message: `recovery: sent to ${customer.email}`, status: "sent", sentAt: new Date() },
    })
  }

  return { swept: candidates.length }
}

// Reminder timing per plan length, days before the plan's end date.
const REMINDER_OFFSET_DAYS: Record<number, number> = { 7: 2, 14: 4, 28: 7 }

export async function runRenewalReminderSweep() {
  const active = await prisma.subscription.findMany({
    where: { status: "ACTIVE" },
    include: { customer: true },
  })

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

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
  const [recovery, renewalReminders] = await Promise.all([runRecoverySweep(), runRenewalReminderSweep()])
  res.json({ recovery, renewalReminders })
})
