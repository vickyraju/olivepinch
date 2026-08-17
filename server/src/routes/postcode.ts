import { Router } from "express"
import { z } from "zod"
import { prisma } from "../lib/prisma.js"
import { formatPostcode, isPostcodeInActiveZone } from "../lib/postcode.js"
import { validateBody } from "../middleware/validate.js"

export const postcodeRouter = Router()

postcodeRouter.post(
  "/check",
  validateBody(z.object({ postcode: z.string().min(3) })),
  async (req, res) => {
    const { postcode } = req.body as { postcode: string }
    const valid = await isPostcodeInActiveZone(postcode)
    res.json({ valid, postcode: valid ? formatPostcode(postcode) : postcode.trim().toUpperCase() })
  }
)

postcodeRouter.post(
  "/leads",
  validateBody(z.object({ email: z.string().email(), postcode: z.string().min(3) })),
  async (req, res) => {
    const { email, postcode } = req.body as { email: string; postcode: string }
    await prisma.lead.create({ data: { email, postcode } })
    res.status(201).json({ ok: true })
  }
)
