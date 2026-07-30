import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { signToken } from "../lib/auth.js"
import { sendEmail } from "../lib/email.js"

export const internalRouter = Router()

// FR-C26: customers who paid but never finished OTP/password verification. Swept
// periodically (see vercel.json's cron entry) rather than sent immediately at payment
// time, since the customer may still come back and finish signup on their own.
export async function runRecoverySweep() {
  const candidates = await prisma.customer.findMany({
    where: {
      accountStatus: "PROVISIONAL",
      payments: { some: { status: "succeeded" } },
      notifications: { none: { message: { startsWith: "recovery:" } } },
    },
  })

  for (const customer of candidates) {
    const token = signToken(`${customer.id}:signup`)
    const link = `${process.env.APP_URL ?? "http://localhost:5173"}/complete-account?token=${token}`
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

// Cron-only endpoint — no admin login involved (nothing to click), gated by a shared
// secret instead. Vercel Cron sends this same value as a Bearer token automatically
// when CRON_SECRET is set as an env var. Fails closed: without CRON_SECRET configured,
// this endpoint refuses to run rather than being open to anyone on the internet.
internalRouter.post("/recovery-sweep", async (req, res) => {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return res.status(501).json({ error: "CRON_SECRET is not configured" })
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Invalid cron secret" })
  }
  res.json(await runRecoverySweep())
})
