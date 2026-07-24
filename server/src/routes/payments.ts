import { Router } from "express"
import { z } from "zod"
import { prisma } from "../lib/prisma.js"
import { stripe } from "../lib/stripe.js"
import { validateBody } from "../middleware/validate.js"
import { issueOtp } from "../lib/otp.js"

export const paymentsRouter = Router()

async function subscriptionTotal(subscriptionId: string) {
  const orders = await prisma.order.findMany({
    where: { subscriptionId },
    include: { items: { include: { menuItem: true } } },
  })
  return orders.reduce((sum, order) => sum + order.items.reduce((s, i) => s + Number(i.menuItem.price), 0), 0)
}

// FR-C13/FR-C14: total is recomputed server-side (never trust a client-sent amount).
// Without STRIPE_SECRET_KEY configured, falls back to a dev-mode intent so checkout
// stays testable — swap for a real key to exercise the real Stripe flow.
paymentsRouter.post(
  "/intent",
  validateBody(z.object({ subscriptionId: z.string() })),
  async (req, res) => {
    const { subscriptionId } = req.body as { subscriptionId: string }
    const subscription = await prisma.subscription.findUniqueOrThrow({ where: { id: subscriptionId } })
    const total = await subscriptionTotal(subscriptionId)

    if (!stripe) {
      return res.json({ devMode: true, subscriptionId, amount: total })
    }

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: "gbp",
      metadata: { subscriptionId, customerId: subscription.customerId },
    })
    await prisma.payment.create({
      data: {
        customerId: subscription.customerId,
        subscriptionId,
        amount: total,
        status: "pending",
        providerRef: intent.id,
      },
    })
    res.json({ clientSecret: intent.client_secret, amount: total })
  }
)

async function activateSubscription(subscriptionId: string) {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "ACTIVE" },
    include: { customer: true },
  })

  // FR-C16: payment success triggers the signup OTP. FR-C26's "complete your account"
  // recovery link is for customers who *don't* finish signup — that needs a deferred
  // sweep (e.g. a cron job over PROVISIONAL customers with a paid subscription), not
  // an immediate send here. Deferred: no scheduler wired up in this pass.
  if (subscription.customer.accountStatus === "PROVISIONAL") {
    await issueOtp(subscription.customerId, "signup", subscription.customer.email)
  }
  return subscription
}

// Dev-mode / client-confirmed path — for a production Stripe key, prefer the webhook below.
paymentsRouter.post(
  "/confirm",
  validateBody(z.object({ subscriptionId: z.string(), paymentIntentId: z.string().optional() })),
  async (req, res) => {
    const { subscriptionId, paymentIntentId } = req.body as { subscriptionId: string; paymentIntentId?: string }

    if (stripe && paymentIntentId) {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId)
      if (intent.status !== "succeeded") {
        return res.status(402).json({ error: "Payment has not succeeded yet" })
      }
      await prisma.payment.updateMany({
        where: { providerRef: paymentIntentId },
        data: { status: "succeeded", paidAt: new Date() },
      })
    } else {
      const total = await subscriptionTotal(subscriptionId)
      const subscription = await prisma.subscription.findUniqueOrThrow({ where: { id: subscriptionId } })
      await prisma.payment.create({
        data: { customerId: subscription.customerId, subscriptionId, amount: total, status: "succeeded", paidAt: new Date() },
      })
    }

    const subscription = await activateSubscription(subscriptionId)
    res.json({ customerId: subscription.customerId, status: subscription.status })
  }
)

// Production path: Stripe calls this directly. Requires STRIPE_WEBHOOK_SECRET and a public URL.
paymentsRouter.post("/webhook", async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(501).json({ error: "Stripe webhook not configured" })
  }
  const signature = req.headers["stripe-signature"]
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, signature as string, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${err}` })
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as { id: string; metadata: { subscriptionId?: string } }
    await prisma.payment.updateMany({ where: { providerRef: intent.id }, data: { status: "succeeded", paidAt: new Date() } })
    if (intent.metadata.subscriptionId) await activateSubscription(intent.metadata.subscriptionId)
  }

  res.json({ received: true })
})
