import { Router } from "express"
import { z } from "zod"
import { prisma } from "../lib/prisma.js"
import { formatPostcode } from "../lib/postcode.js"
import { validateBody } from "../middleware/validate.js"

export const postcodeRouter = Router()

const UK_POSTCODE = /^([A-Z]{1,2})[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i

postcodeRouter.post(
  "/check",
  validateBody(z.object({ postcode: z.string().min(3) })),
  async (req, res) => {
    const { postcode } = req.body as { postcode: string }
    const normalized = postcode.trim().toUpperCase()
    const match = normalized.match(UK_POSTCODE)

    if (!match) return res.json({ valid: false, postcode: normalized })

    try {
      const pcResponse = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(normalized)}`)
      if (!pcResponse.ok) return res.json({ valid: false, postcode: normalized })

      const { result } = (await pcResponse.json()) as { result: { outcode: string } }
      const areaMatch = result.outcode.match(/^[A-Z]+/)
      const area = areaMatch ? areaMatch[0] : ''

      const activeZones = await prisma.zone.findMany({ where: { isActive: true } })
      const valid = activeZones.some((zone) => zone.postcodePrefixes.includes(area))

      res.json({ valid, postcode: valid ? formatPostcode(postcode) : normalized })
    } catch {
      res.json({ valid: false, postcode: normalized })
    }
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
