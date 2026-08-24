import { Router } from "express"
import { z } from "zod"
import { prisma } from "../lib/prisma.js"
import { worldpayConfig, createHostedPayment, queryPaymentStatus } from "../lib/worldpay.js"
import { validateBody } from "../middleware/validate.js"
import { sendEmail } from "../lib/email.js"
import { subscriptionConfirmationEmail } from "../lib/email-templates.js"
import { planPrice } from "../lib/pricing.js"
import type { Goal } from "@prisma/client"

export const paymentsRouter = Router()

async function subscriptionTotal(subscriptionId: string) {
  const subscription = await prisma.subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
    include: { customer: true },
  })
  return planPrice(subscription.customer.goal as Goal, subscription.planDuration)
}

// Only two return destinations ever legitimately exist (the funnel's default, computed
// server-side below, and the dashboard renewal case) — allowlisting the exact string
// closes the whole open-redirect bug class (//evil.com, /\evil.com, etc. all pass a
// naive startsWith("/") check) rather than trying to out-pattern-match every bypass.
const ALLOWED_RETURN_PATHS = ["/dashboard/subscription?renewalPending=1"] as const

// FR-C13/FR-C14: total is recomputed server-side (never trust a client-sent amount).
// Without WORLDPAY_USERNAME/PASSWORD/ENTITY configured, falls back to a dev-mode
// intent so checkout stays testable — swap for real credentials to exercise the
// real Worldpay Hosted Payment Pages flow.
paymentsRouter.post(
  "/intent",
  validateBody(z.object({ subscriptionId: z.string(), returnPath: z.enum(ALLOWED_RETURN_PATHS).optional() })),
  async (req, res) => {
    const { subscriptionId, returnPath } = req.body as { subscriptionId: string; returnPath?: string }
    const subscription = await prisma.subscription.findUniqueOrThrow({ where: { id: subscriptionId } })
    const total = await subscriptionTotal(subscriptionId)

    if (!worldpayConfig) {
      return res.json({ devMode: true, subscriptionId, amount: total })
    }

    const path = returnPath ?? `/subscribe/payment/return?subscriptionId=${subscriptionId}`
    const resultUrl = `${process.env.APP_URL ?? "http://localhost:5173"}${path}`
    const { redirectUrl, statusQueryUrl } = await createHostedPayment({
      transactionReference: subscriptionId,
      amountMinorUnits: Math.round(total * 100),
      currency: "GBP",
      narrativeLine1: "OlivePinch",
      resultUrl,
    })
    await prisma.payment.create({
      data: {
        customerId: subscription.customerId,
        subscriptionId,
        amount: total,
        status: "pending",
        providerRef: statusQueryUrl,
      },
    })
    res.json({ redirectUrl, amount: total })
  }
)

async function activateSubscription(subscriptionId: string) {
  // Identity verification (phone OTP via Firebase) is a separate step the frontend drives
  // directly against Firebase — payment succeeding doesn't trigger it here.
  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "ACTIVE" },
    include: { customer: true },
  })
}

// Dev-mode auto-succeeds. With Worldpay configured, resolves the outcome server-side
// via the status-query URL saved on the pending Payment row — never trusts a
// client-supplied "it succeeded" flag.
paymentsRouter.post(
  "/confirm",
  validateBody(z.object({ subscriptionId: z.string() })),
  async (req, res) => {
    const { subscriptionId } = req.body as { subscriptionId: string }

    if (worldpayConfig) {
      const pending = await prisma.payment.findFirst({
        where: { subscriptionId, status: "pending" },
        orderBy: { createdAt: "desc" },
      })
      if (!pending?.providerRef) {
        return res.status(402).json({ error: "No pending payment found for this subscription" })
      }
      const { succeeded } = await queryPaymentStatus(pending.providerRef)
      if (!succeeded) {
        await prisma.payment.update({ where: { id: pending.id }, data: { status: "failed" } })
        return res.status(402).json({ error: "Payment has not succeeded" })
      }
      await prisma.payment.update({ where: { id: pending.id }, data: { status: "succeeded", paidAt: new Date() } })
    } else {
      const total = await subscriptionTotal(subscriptionId)
      const subscription = await prisma.subscription.findUniqueOrThrow({ where: { id: subscriptionId } })
      await prisma.payment.create({
        data: { customerId: subscription.customerId, subscriptionId, amount: total, status: "succeeded", paidAt: new Date() },
      })
    }

    const subscription = await activateSubscription(subscriptionId)

    // First-ever subscription for this customer (renewals create a new Subscription row too,
    // so "only one exists" is what distinguishes initial signup from a renewal) — send the
    // welcome/confirmation email. Never let an email failure fail a paid checkout's response.
    const subscriptionCount = await prisma.subscription.count({ where: { customerId: subscription.customerId } })
    if (subscriptionCount === 1 && subscription.customer.email) {
      try {
        const total = await subscriptionTotal(subscriptionId)
        const { subject, text, html } = subscriptionConfirmationEmail({
          name: subscription.customer.fullName,
          planDuration: subscription.planDuration,
          startDate: subscription.startDate.toISOString().slice(0, 10),
          mealsPerDay: subscription.mealsPerDay,
          total,
        })
        await sendEmail(subscription.customer.email, subject, text, html)
      } catch (err) {
        console.error("subscription confirmation email failed", subscriptionId, err)
      }
    }

    res.json({ customerId: subscription.customerId, status: subscription.status })
  }
)

// Optional belt-and-braces on top of /confirm's status-query path — Worldpay webhooks
// need separate webhook-URL configuration from a Worldpay Implementation Manager, same
// non-self-serve gate as credentials, so this stays a stub until that config exists.
paymentsRouter.post("/webhook", async (_req, res) => {
  res.status(501).json({ error: "Worldpay webhook not configured" })
})
