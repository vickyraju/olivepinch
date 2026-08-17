import { Router } from "express"
import { z } from "zod"
import { prisma } from "../lib/prisma.js"
import { calculateBmi, bmiCategory } from "../lib/bmi.js"
import { requireAuth, verifySupabaseUser } from "../middleware/auth.js"
import { validateBody } from "../middleware/validate.js"
import { GOAL_VALUES, DIET_VALUES } from "../lib/enums.js"
import { isPostcodeInActiveZone } from "../lib/postcode.js"

export const customersRouter = Router()

// Called right after a Supabase sign-in (OTP or OAuth) succeeds, whether that's finishing
// signup or a returning login — both cases just need "find the Customer for this verified
// email and attach this Supabase user id to it". Doesn't use requireAuth: there's no linked
// Customer to resolve to yet, that's exactly what this endpoint creates.
customersRouter.post("/link-account", async (req, res) => {
  const supaUser = await verifySupabaseUser(req.headers.authorization)
  const customer = await prisma.customer.findUnique({ where: { email: supaUser.email } })
  if (!customer) {
    return res.status(404).json({ error: "No OlivePinch account found for this email — start your plan first." })
  }
  // Already linked to a *different* Supabase user than the one making this call — never
  // fall through and hand back someone else's profile just because the emails happen to
  // match right now (e.g. after an email change on either side). Refuse instead of guessing.
  if (customer.supabaseUserId && customer.supabaseUserId !== supaUser.id) {
    return res.status(409).json({ error: "This email is already linked to a different account." })
  }
  if (!customer.supabaseUserId) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        supabaseUserId: supaUser.id,
        ...(customer.accountStatus === "PROVISIONAL" ? { accountStatus: "ACTIVE" as const } : {}),
      },
    })
  }
  const linked = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } })
  const { passwordHash: _passwordHash, ...safe } = linked
  res.json(safe)
})

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
  // ACTIVE and READ_ONLY both mean a real password already exists on this email — only
  // PROVISIONAL (mid-signup) and DELETED (scrubbed) are safe to upsert over.
  if (existing && (existing.accountStatus === "ACTIVE" || existing.accountStatus === "READ_ONLY")) {
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
  dietTypes: z.array(z.enum(DIET_VALUES as [string, ...string[]])).min(1),
  allergens: z.array(z.string()).default([]),
  postcode: z.string().optional(),
})

customersRouter.patch("/:id/preferences", validateBody(preferencesSchema), async (req, res) => {
  const body = req.body as z.infer<typeof preferencesSchema>
  const customer = await prisma.customer.update({
    where: { id: req.params.id as string },
    data: {
      goal: body.goal as never,
      dietTypes: body.dietTypes as never,
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

const updateAddressSchema = z.object({
  addressDoorNumber: z.string().min(1),
  addressBuildingName: z.string().optional(),
  addressStreet: z.string().min(1),
  addressArea: z.string().min(1),
  addressPostcode: z.string().min(1),
})

// Separate from PATCH /me since, unlike the other self-service fields, the postcode here
// must be re-checked against active delivery zones every time — we only deliver to
// Birmingham right now, and a customer could otherwise move their account to an
// undeliverable address with no server-side check.
customersRouter.patch("/me/address", requireAuth, validateBody(updateAddressSchema), async (req, res) => {
  const body = req.body as z.infer<typeof updateAddressSchema>
  if (!(await isPostcodeInActiveZone(body.addressPostcode))) {
    return res.status(400).json({ error: "We don't currently deliver to that postcode" })
  }
  const customer = await prisma.customer.update({
    where: { id: req.customerId },
    data: body,
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
        supabaseUserId: null,
        passwordHash: null,
        gender: null,
        age: null,
        heightCm: null,
        weightKg: null,
        goal: null,
        dietTypes: [],
        allergens: [],
        postcode: null,
        addressDoorNumber: null,
        addressBuildingName: null,
        addressStreet: null,
        addressArea: null,
        addressPostcode: null,
        accountStatus: "DELETED",
      },
    }),
  ])
  res.status(204).send()
})
