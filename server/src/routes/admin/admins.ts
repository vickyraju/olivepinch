import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../lib/prisma.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { validateBody } from "../../middleware/validate.js"
import { hashPassword } from "../../lib/auth.js"

export const adminAdminsRouter = Router()
adminAdminsRouter.use(requireAdminAuth)

adminAdminsRouter.get("/", async (_req, res) => {
  res.json(await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, createdAt: true } }))
})

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

// Any logged-in admin can invite another — there's no role hierarchy in this schema (single
// AdminUser type), so this is intentionally not gated further.
adminAdminsRouter.post("/", validateBody(createSchema), async (req, res) => {
  const body = req.body as z.infer<typeof createSchema>
  const passwordHash = await hashPassword(body.password)
  const admin = await prisma.adminUser.create({
    data: { name: body.name, email: body.email, passwordHash },
    select: { id: true, name: true, email: true, createdAt: true },
  })
  res.status(201).json(admin)
})

// Prevents an admin from locking themselves (or the last admin) out entirely.
adminAdminsRouter.delete("/:id", async (req, res) => {
  const count = await prisma.adminUser.count()
  if (count <= 1) return res.status(400).json({ error: "Can't delete the last remaining admin" })
  if (req.params.id === req.adminId) return res.status(400).json({ error: "Can't delete your own account while logged in" })
  await prisma.adminUser.delete({ where: { id: req.params.id as string } })
  res.status(204).send()
})
