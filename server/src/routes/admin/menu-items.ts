import { Router } from "express"
import type { Response } from "express"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { validateBody } from "../../middleware/validate.js"
import { GOAL_VALUES, DIET_VALUES, MEAL_SLOT_VALUES, PLAN_TIER_VALUES } from "../../lib/enums.js"
import { getImageDimensions } from "../../lib/image-dimensions.js"

export const adminMenuItemsRouter = Router()
adminMenuItemsRouter.use(requireAdminAuth)

// Menu photos are uploaded as a data: URL and must be exactly this size — keeps every
// card in the admin grid and the customer menu uniformly cropped with no client resizing.
export const REQUIRED_PHOTO_WIDTH = 1200
export const REQUIRED_PHOTO_HEIGHT = 800

adminMenuItemsRouter.get("/", async (_req, res) => {
  res.json(await prisma.menuItem.findMany({ orderBy: [{ slot: "asc" }, { name: "asc" }] }))
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

function photoError(res: Response, photoUrl: string | undefined) {
  if (!photoUrl) return null
  const match = /^data:image\/(png|jpeg);base64,(.+)$/.exec(photoUrl)
  if (!match) return res.status(400).json({ error: "Photo must be a PNG or JPEG upload" })
  const dims = getImageDimensions(Buffer.from(match[2] as string, "base64"))
  if (!dims || dims.width !== REQUIRED_PHOTO_WIDTH || dims.height !== REQUIRED_PHOTO_HEIGHT) {
    return res.status(400).json({ error: `Photo must be exactly ${REQUIRED_PHOTO_WIDTH}x${REQUIRED_PHOTO_HEIGHT}px` })
  }
  return null
}

// FR-A01: manage menu items (name, description, photo, dietary/allergen tags)
adminMenuItemsRouter.post("/", validateBody(menuItemSchema), async (req, res) => {
  if (photoError(res, req.body.photoUrl)) return
  const item = await prisma.menuItem.create({ data: req.body as never })
  res.status(201).json(item)
})

adminMenuItemsRouter.patch("/:id", validateBody(menuItemSchema.partial()), async (req, res) => {
  if (photoError(res, req.body.photoUrl)) return
  const item = await prisma.menuItem.update({ where: { id: req.params.id as string }, data: req.body as never })
  res.json(item)
})

adminMenuItemsRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.menuItem.delete({ where: { id: req.params.id as string } })
    res.status(204).send()
  } catch (err) {
    // P2003: foreign key violation — this item is referenced by an OrderItem (near-certain
    // for anything that's ever actually been served, since orders are created for the whole
    // plan duration up front) or a MenuWeekItem. There's no soft-delete/active flag on
    // MenuItem to redirect to yet, so the clearest thing to do today is explain why, rather
    // than let the raw constraint error surface as an opaque 500.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return res.status(409).json({ error: "This item has already been used in orders and can't be deleted." })
    }
    throw err
  }
})
