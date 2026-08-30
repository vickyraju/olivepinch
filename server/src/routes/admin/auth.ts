import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../lib/prisma.js"
import { validateBody } from "../../middleware/validate.js"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { adminLoginLimiter } from "../../middleware/rate-limit.js"
import { verifyPassword, signAdminToken } from "../../lib/auth.js"

export const adminAuthRouter = Router()

adminAuthRouter.post(
  "/login",
  adminLoginLimiter,
  validateBody(z.object({ email: z.string().email(), password: z.string() })),
  async (req, res) => {
    const { email, password } = req.body as { email: string; password: string }
    const admin = await prisma.adminUser.findUnique({ where: { email } })
    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" })
    }
    res.json({ token: signAdminToken(admin.id), actor: { id: admin.id, name: admin.name, email: admin.email } })
  }
)

adminAuthRouter.get("/me", requireAdminAuth, async (req, res) => {
  const admin = await prisma.adminUser.findUniqueOrThrow({ where: { id: req.adminId } })
  res.json({ id: admin.id, name: admin.name, email: admin.email })
})
