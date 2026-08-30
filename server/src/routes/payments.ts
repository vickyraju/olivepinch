import { Router } from "express"
import { z } from "zod"
import { prisma } from "../lib/prisma.js"
import { worldpayConfig, createHostedPayment, queryPaymentStatus } from "../lib/worldpay.js"
import { validateBody } from "../middleware/validate.js"
import { sendEmail } from "../lib/email.js"
import { subscriptionConfirmationEmail, renewalConfirmationEmail } from "../lib/email-templates.js"
import { planPrice } from "../lib/pricing.js"
import { GOAL_LABELS } from "../lib/enums.js"
import type { Goal, PlanTier } from "@prisma/client"

export const paymentsRouter = Router()

async function subscriptionTotal(subscriptionId: string) {
  const subscription = await prisma.subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
    include: { customer: true },
  })
  const price = await planPrice(
    subscription.customer.goal as Goal,
    subscription.planDuration,
    subscription.tier as PlanTier,
    subscription.mealsPerDay as 1 | 2 | 3
  )
  return Math.max(0, price - Number(subscription.discountAmount))
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
    // A retried/duplicated /intent call (double-click, network retry, browser back-then-forward)
    // would otherwise leave two "pending" rows for the same subscription — /confirm's lookup
    // picks the most recent one, which is correct only if older ones are no longer pending.
    // Superseding here (rather than deleting) keeps the abandoned hosted-page attempt on record.
    await prisma.payment.updateMany({
      where: { subscriptionId, status: "pending" },
      data: { status: "superseded" },
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
  // Redemption is recorded here (post-payment), not at checkout start, so abandoned
  // checkouts never count against a promo code's redemption caps.
  const subscription = await prisma.subscription.findUniqueOrThrow({ where: { id: subscriptionId } })
  return prisma.$transaction(async (tx) => {
    const updated = await tx.subscription.update({
      where: { id: subscriptionId },
      data: { status: "ACTIVE" },
      include: { customer: true },
    })
    if (subscription.promoCodeId) {
      await tx.promoRedemption.create({
        data: { promoCodeId: subscription.promoCodeId, customerId: subscription.customerId, subscriptionId },
      })
    }
    return updated
  })
}

type ConfirmResult = { ok: true; customerId: string; status: string } | { ok: false; httpStatus: number; error: string }

// Shared by the /confirm route and the stuck-pending-payment sweep in internal.ts (a customer
// whose payment succeeded at Worldpay but whose browser never made it back to call /confirm —
// closed tab, lost network mid-redirect — would otherwise sit unpaid-looking forever).
// Dev-mode auto-succeeds. With Worldpay configured, resolves the outcome server-side via the
// status-query URL saved on the pending Payment row — never trusts a client-supplied flag.
async function confirmPayment(subscriptionId: string): Promise<ConfirmResult> {
  // Idempotency: a browser retry, a duplicate confirm call after the customer already landed
  // on the success page, or the sweep re-checking something already resolved should never
  // re-query Worldpay, re-run activation side effects, or send a second confirmation email.
  const existing = await prisma.subscription.findUniqueOrThrow({ where: { id: subscriptionId } })
  if (existing.status === "ACTIVE") {
    return { ok: true, customerId: existing.customerId, status: existing.status }
  }
  // A replayed/late confirm call must never move a subscription the admin has since cancelled
  // (or one that's already expired) back to ACTIVE — PENDING_PAYMENT is the only state
  // confirmation is meaningful from.
  if (existing.status !== "PENDING_PAYMENT") {
    return { ok: false, httpStatus: 409, error: `This subscription is ${existing.status.toLowerCase()} and can't be confirmed` }
  }

  if (worldpayConfig) {
    const pending = await prisma.payment.findFirst({
      where: { subscriptionId, status: "pending" },
      orderBy: { createdAt: "desc" },
    })
    if (!pending?.providerRef) {
      return { ok: false, httpStatus: 402, error: "No pending payment found for this subscription" }
    }
    const { succeeded } = await queryPaymentStatus(pending.providerRef)
    if (!succeeded) {
      await prisma.payment.update({ where: { id: pending.id }, data: { status: "failed" } })
      return { ok: false, httpStatus: 402, error: "Payment has not succeeded" }
    }
    await prisma.payment.update({ where: { id: pending.id }, data: { status: "succeeded", paidAt: new Date() } })
  } else {
    const total = await subscriptionTotal(subscriptionId)
    await prisma.payment.create({
      data: { customerId: existing.customerId, subscriptionId, amount: total, status: "succeeded", paidAt: new Date() },
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
        goalLabel: GOAL_LABELS[subscription.customer.goal as Goal],
        planDuration: subscription.planDuration,
        startDate: subscription.startDate.toISOString().slice(0, 10),
        mealsPerDay: subscription.mealsPerDay,
        deliveryTimeSlot: subscription.deliveryTimeSlot,
        total,
        dashboardUrl: `${process.env.APP_URL ?? "http://localhost:5173"}/dashboard/subscription`,
      })
      await sendEmail(subscription.customer.email, subject, text, html)
    } catch (err) {
      console.error("subscription confirmation email failed", subscriptionId, err)
    }
  } else if (subscription.customer.email) {
    try {
      const total = await subscriptionTotal(subscriptionId)
      const { subject, text, html } = renewalConfirmationEmail({
        name: subscription.customer.fullName,
        planDuration: subscription.planDuration,
        startDate: subscription.startDate.toISOString().slice(0, 10),
        mealsPerDay: subscription.mealsPerDay,
        total,
        dashboardUrl: `${process.env.APP_URL ?? "http://localhost:5173"}/dashboard/subscription`,
      })
      await sendEmail(subscription.customer.email, subject, text, html)
    } catch (err) {
      console.error("renewal confirmation email failed", subscriptionId, err)
    }
  }

  return { ok: true, customerId: subscription.customerId, status: subscription.status }
}

export { confirmPayment }

paymentsRouter.post(
  "/confirm",
  validateBody(z.object({ subscriptionId: z.string() })),
  async (req, res) => {
    const { subscriptionId } = req.body as { subscriptionId: string }
    const result = await confirmPayment(subscriptionId)
    if (!result.ok) return res.status(result.httpStatus).json({ error: result.error })
    res.json({ customerId: result.customerId, status: result.status })
  }
)

// Optional belt-and-braces on top of /confirm's status-query path — Worldpay webhooks
// need separate webhook-URL configuration from a Worldpay Implementation Manager, same
// non-self-serve gate as credentials, so this stays a stub until that config exists.
paymentsRouter.post("/webhook", async (_req, res) => {
  res.status(501).json({ error: "Worldpay webhook not configured" })
})
