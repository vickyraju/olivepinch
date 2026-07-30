import { Router } from "express"
import { z } from "zod"
import { prisma } from "../lib/prisma.js"
import { calculateBmi, bmiCategory } from "../lib/bmi.js"
import { requireAuth } from "../middleware/auth.js"
import { validateBody } from "../middleware/validate.js"
import { GOAL_VALUES, DIET_VALUES } from "../lib/enums.js"

export const customersRouter = Router()

const provisionalSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  gender: z.string().optional(),
  age: z.number().int().min(16).max(100),
  heightCm: z.number().positive(),
  weightKg: z.number().positive(),
  healthConsent: z.literal(true),
  marketingOptIn: z.boolean().default(false),
})

// FR-C26: provisional account is created at the *start* of checkout, not after payment,
// so a payment-succeeds-but-signup-fails customer always has a record to recover into.
customersRouter.post("/provisional", validateBody(provisionalSchema), async (req, res) => {
  const body = req.body as z.infer<typeof provisionalSchema>

  const existing = await prisma.customer.findUnique({ where: { email: body.email }, select: { accountStatus: true } })
  if (existing && existing.accountStatus === "ACTIVE") {
    return res.status(409).json({ error: "An account with this email already exists — log in instead." })
  }

  const customer = await prisma.customer.upsert({
    where: { email: body.email },
    update: {
      fullName: body.fullName,
      gender: body.gender,
      age: body.age,
      heightCm: body.heightCm,
      weightKg: body.weightKg,
      marketingOptIn: body.marketingOptIn,
    },
    create: {
      fullName: body.fullName,
      email: body.email,
      gender: body.gender,
      age: body.age,
      heightCm: body.heightCm,
      weightKg: body.weightKg,
      marketingOptIn: body.marketingOptIn,
    },
  })

  await prisma.consentLog.create({
    data: { customerId: customer.id, consentType: "health_data", granted: true, version: "1.0" },
  })
  if (body.marketingOptIn) {
    await prisma.consentLog.create({
      data: { customerId: customer.id, consentType: "marketing", granted: true, version: "1.0" },
    })
  }

  const bmi = calculateBmi(body.heightCm, body.weightKg)
  res.status(201).json({ customerId: customer.id, bmi, bmiCategory: bmiCategory(bmi) })
})

const preferencesSchema = z.object({
  goal: z.enum(GOAL_VALUES as [string, ...string[]]),
  dietType: z.enum(DIET_VALUES as [string, ...string[]]),
  allergens: z.array(z.string()).default([]),
  postcode: z.string().optional(),
})

customersRouter.patch("/:id/preferences", validateBody(preferencesSchema), async (req, res) => {
  const body = req.body as z.infer<typeof preferencesSchema>
  const customer = await prisma.customer.update({
    where: { id: req.params.id as string },
    data: {
      goal: body.goal as never,
      dietType: body.dietType as never,
      allergens: body.allergens,
      postcode: body.postcode,
    },
  })
  res.json({ customerId: customer.id })
})

customersRouter.get("/me", requireAuth, async (req, res) => {
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: req.customerId } })
  const { passwordHash: _passwordHash, ...safe } = customer
  res.json(safe)
})

const updateMeSchema = z.object({
  marketingOptIn: z.boolean().optional(),
})

customersRouter.patch("/me", requireAuth, validateBody(updateMeSchema), async (req, res) => {
  const customer = await prisma.customer.update({
    where: { id: req.customerId },
    data: req.body,
  })
  const { passwordHash: _passwordHash, ...safe } = customer
  res.json(safe)
})

// FR-G05: self-service data export (Right to Access / Data Portability)
customersRouter.get("/me/export", requireAuth, async (req, res) => {
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: req.customerId },
    include: { healthLogs: true, subscriptions: { include: { orders: { include: { items: true } } } }, payments: true, consentLogs: true },
  })
  const { passwordHash: _passwordHash, ...exportable } = customer
  res.setHeader("Content-Disposition", "attachment; filename=olivepinch-my-data.json")
  res.json(exportable)
})

// FR-G06: self-service erasure — payment records are retained for UK tax law, everything else is deleted
customersRouter.delete("/me", requireAuth, async (req, res) => {
  const customerId = req.customerId!
  await prisma.$transaction([
    prisma.healthLog.deleteMany({ where: { customerId } }),
    prisma.consentLog.deleteMany({ where: { customerId } }),
    prisma.notification.deleteMany({ where: { customerId } }),
    prisma.otp.deleteMany({ where: { customerId } }),
    prisma.orderItem.deleteMany({ where: { order: { subscription: { customerId } } } }),
    prisma.order.deleteMany({ where: { subscription: { customerId } } }),
    prisma.subscription.deleteMany({ where: { customerId } }),
    prisma.customer.update({
      where: { id: customerId },
      data: {
        fullName: "Deleted customer",
        email: `deleted-${customerId}@olivepinch.invalid`,
        passwordHash: null,
        gender: null,
        age: null,
        heightCm: null,
        weightKg: null,
        goal: null,
        dietType: null,
        allergens: [],
        postcode: null,
        address: null,
        accountStatus: "DELETED",
      },
    }),
  ])
  res.status(204).send()
})
