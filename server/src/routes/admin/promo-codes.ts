import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { validateBody } from "../../middleware/validate.js"
import { GOAL_VALUES, PLAN_TIER_VALUES } from "../../lib/enums.js"

export const adminPromoCodesRouter = Router()
adminPromoCodesRouter.use(requireAdminAuth)

adminPromoCodesRouter.get("/", async (_req, res) => {
  res.json(
    await prisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { redemptions: true } } },
    })
  )
})

const promoCodeSchema = z.object({
  code: z.string().trim().min(1).transform((c) => c.toUpperCase()),
  discountType: z.enum(["PERCENT", "FLAT"]),
  discountValue: z.number().positive(),
  minPlanDuration: z.union([z.literal(7), z.literal(14), z.literal(28)]).optional(),
  expiresAt: z.string().datetime().optional(),
  maxRedemptions: z.number().int().positive().optional(),
  maxRedemptionsPerCustomer: z.number().int().positive().optional(),
  restrictToGoal: z.enum(GOAL_VALUES as [string, ...string[]]).optional(),
  restrictToTier: z.enum(PLAN_TIER_VALUES as [string, ...string[]]).optional(),
  firstSubscriptionOnly: z.boolean().default(false),
  active: z.boolean().default(true),
})

adminPromoCodesRouter.post("/", validateBody(promoCodeSchema), async (req, res) => {
  const body = req.body as z.infer<typeof promoCodeSchema>
  const promoCode = await prisma.promoCode.create({
    data: { ...body, expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined } as never,
  })
  res.status(201).json(promoCode)
})

adminPromoCodesRouter.patch("/:id", validateBody(promoCodeSchema.partial()), async (req, res) => {
  const body = req.body as Partial<z.infer<typeof promoCodeSchema>>
  const promoCode = await prisma.promoCode.update({
    where: { id: req.params.id as string },
    data: { ...body, expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined } as never,
  })
  res.json(promoCode)
})

adminPromoCodesRouter.delete("/:id", async (req, res) => {
  await prisma.promoCode.delete({ where: { id: req.params.id as string } })
  res.status(204).send()
})
