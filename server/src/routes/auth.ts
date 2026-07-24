import { Router } from "express"
import { z } from "zod"
import rateLimit from "express-rate-limit"
import { prisma } from "../lib/prisma.js"
import { validateBody } from "../middleware/validate.js"
import { verifyOtp, hashPassword, verifyPassword, signToken, verifyToken } from "../lib/auth.js"
import { issueOtp } from "../lib/otp.js"

export const authRouter = Router()

const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 })

authRouter.post(
  "/otp/send",
  otpLimiter,
  validateBody(z.object({ customerId: z.string(), purpose: z.enum(["signup", "password_reset"]) })),
  async (req, res) => {
    const { customerId, purpose } = req.body as { customerId: string; purpose: string }
    const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })
    await issueOtp(customerId, purpose, customer.email)
    res.json({ sent: true })
  }
)

authRouter.post(
  "/otp/verify",
  otpLimiter,
  validateBody(z.object({ customerId: z.string(), code: z.string().length(6), purpose: z.enum(["signup", "password_reset"]) })),
  async (req, res) => {
    const { customerId, code, purpose } = req.body as { customerId: string; code: string; purpose: string }
    const otp = await prisma.otp.findFirst({
      where: { customerId, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    })
    if (!otp || !(await verifyOtp(code, otp.codeHash))) {
      return res.status(400).json({ error: "Invalid or expired code" })
    }
    await prisma.otp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } })
    const verificationToken = signToken(`${customerId}:${purpose}`)
    res.json({ verified: true, verificationToken })
  }
)

authRouter.post(
  "/password",
  validateBody(z.object({ customerId: z.string(), password: z.string().min(8), verificationToken: z.string() })),
  async (req, res) => {
    const { customerId, password, verificationToken } = req.body as { customerId: string; password: string; verificationToken: string }
    let payload: { sub: string }
    try {
      payload = verifyToken(verificationToken)
    } catch {
      return res.status(401).json({ error: "Verification expired — request a new code" })
    }
    if (payload.sub !== `${customerId}:signup` && payload.sub !== `${customerId}:password_reset`) {
      return res.status(401).json({ error: "Verification does not match this account" })
    }
    const passwordHash = await hashPassword(password)
    await prisma.customer.update({
      where: { id: customerId },
      data: { passwordHash, accountStatus: "ACTIVE" },
    })
    res.json({ token: signToken(customerId) })
  }
)

authRouter.post(
  "/login",
  validateBody(z.object({ email: z.string().email(), password: z.string() })),
  async (req, res) => {
    const { email, password } = req.body as { email: string; password: string }
    const customer = await prisma.customer.findUnique({ where: { email } })
    if (!customer?.passwordHash || !(await verifyPassword(password, customer.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" })
    }
    res.json({ token: signToken(customer.id) })
  }
)

// FR-C26 recovery path: payment succeeded but OTP/password was never completed
authRouter.get("/complete-account", async (req, res) => {
  const token = String(req.query.token ?? "")
  try {
    const payload = verifyToken(token)
    const customerId = payload.sub.split(":")[0]
    const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })
    res.json({ customerId: customer.id, email: customer.email, accountStatus: customer.accountStatus })
  } catch {
    res.status(401).json({ error: "This link has expired — contact support to recover your account" })
  }
})
