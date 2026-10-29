import { Router } from "express"
import type { Response } from "express"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { validateBody } from "../../middleware/validate.js"
import { GOAL_VALUES, DIET_VALUES, MEAL_SLOT_VALUES, PLAN_TIER_VALUES } from "../../lib/enums.js"
import { storeMenuPhoto } from "../../lib/menu-photos.js"
import { londonToday } from "../../lib/subscription.js"

export const adminMenuItemsRouter = Router()
adminMenuItemsRouter.use(requireAdminAuth)

adminMenuItemsRouter.get("/", async (_req, res) => {
  res.json(await prisma.menuItem.findMany({ where: { archivedAt: null }, orderBy: [{ slot: "asc" }, { name: "asc" }] }))
})

const menuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  photoUrl: z.string().optional(),
  slot: z.enum(MEAL_SLOT_VALUES as [string, ...string[]]),
  dietTags: z.array(z.enum(DIET_VALUES as [string, ...string[]])).min(1),
  allergenTags: z.array(z.string()).default([]),
  goalTags: z.array(z.enum(GOAL_VALUES as [string, ...string[]])).default([]),
  tier: z.enum(PLAN_TIER_VALUES as [string, ...string[]]).default("BASIC"),
  kcal: z.number().int().positive(),
  protein: z.number().int().nonnegative(),
  carbs: z.number().int().nonnegative(),
  fat: z.number().int().nonnegative(),
})

// Uploaded photos are resized and stored; the item keeps only the public URL.
async function resolvePhoto(res: Response, photoUrl: string | undefined): Promise<string | null | undefined> {
  if (!photoUrl) return photoUrl
  try {
    return await storeMenuPhoto(photoUrl)
  } catch (err) {
    const status = (err as { status?: number }).status
    if (status === 501) {
      res.status(501).json({ error: "Photo storage is not configured on the server" })
      return null
    }
    res.status(400).json({ error: "Photo must be a valid image file" })
    return null
  }
}

// FR-A01: manage menu items (name, description, photo, dietary/allergen tags)
adminMenuItemsRouter.post("/", validateBody(menuItemSchema), async (req, res) => {
  const photoUrl = await resolvePhoto(res, req.body.photoUrl)
  if (photoUrl === null) return
  const item = await prisma.menuItem.create({ data: { ...req.body, photoUrl } as never })
  res.status(201).json(item)
})

adminMenuItemsRouter.patch("/:id", validateBody(menuItemSchema.partial()), async (req, res) => {
  const photoUrl = await resolvePhoto(res, req.body.photoUrl)
  if (photoUrl === null) return
  const item = await prisma.menuItem.update({ where: { id: req.params.id as string }, data: { ...req.body, photoUrl } as never })
  res.json(item)
})

// Deleting a meal that customers have already been served (or have lined up) must not break their history.
//  - Still in a customer's upcoming delivery: refused, naming how many, so the admin changes those meals first.
//  - Otherwise it comes off every weekly menu that hasn't been served yet.
//  - If past orders or old weekly menus still point at it, it is archived (hidden everywhere, history intact);
//    if nothing does, it is deleted for good.
adminMenuItemsRouter.delete("/:id", async (req, res) => {
  const id = req.params.id as string
  const item = await prisma.menuItem.findUnique({ where: { id } })
  if (!item) return res.status(404).json({ error: "That menu item no longer exists." })
  const today = londonToday()

  const upcoming = await prisma.orderItem.findMany({
    where: { menuItemId: id, order: { deliveryDate: { gte: today }, status: { in: ["SCHEDULED", "PAUSED"] }, subscription: { status: { in: ["ACTIVE", "PENDING_PAYMENT"] } } } },
    select: { order: { select: { deliveryDate: true, subscription: { select: { customer: { select: { fullName: true } } } } } } },
  })
  if (upcoming.length > 0) {
    const names = [...new Set(upcoming.map((u) => u.order.subscription.customer.fullName))]
    const shown = names.slice(0, 3).join(", ") + (names.length > 3 ? ` and ${names.length - 3} more` : "")
    return res.status(409).json({
      error: `"${item.name}" is still chosen for ${upcoming.length} upcoming ${upcoming.length === 1 ? "delivery" : "deliveries"} (${shown}). Change those meals first (Customers, then Meals), then delete it.`,
    })
  }

  await prisma.$transaction([
    prisma.menuWeekItem.deleteMany({ where: { menuItemId: id, date: { gte: today } } }),
  ])
  const stillUsed = (await prisma.orderItem.count({ where: { menuItemId: id } })) + (await prisma.menuWeekItem.count({ where: { menuItemId: id } }))
  if (stillUsed > 0) {
    await prisma.menuItem.update({ where: { id }, data: { archivedAt: new Date() } })
    return res.json({ archived: true })
  }
  await prisma.menuItem.delete({ where: { id } })
  res.json({ archived: false })
})
