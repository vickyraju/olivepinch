import { Router } from "express"
import { z } from "zod"
import { prisma } from "../lib/prisma.js"
import { requireAuth } from "../middleware/auth.js"
import { validateBody } from "../middleware/validate.js"

export const healthLogsRouter = Router()
healthLogsRouter.use(requireAuth)

healthLogsRouter.get("/", async (req, res) => {
  const logs = await prisma.healthLog.findMany({
    where: { customerId: req.customerId },
    orderBy: { loggedAt: "desc" },
  })
  res.json(logs)
})

const logSchema = z.object({
  heightCm: z.number().positive(),
  weightKg: z.number().positive(),
  chestCm: z.number().positive(),
  bicepCm: z.number().positive(),
  abdomenCm: z.number().positive(),
  waistCm: z.number().positive(),
})

// FR-C19/FR-C20: logging is always accepted — weekly cadence is only encouraged client-side via reminders
healthLogsRouter.post("/", validateBody(logSchema), async (req, res) => {
  const log = await prisma.healthLog.create({
    data: { customerId: req.customerId!, ...(req.body as z.infer<typeof logSchema>) },
  })
  res.status(201).json(log)
})

const DELETE_WINDOW_MS = 24 * 60 * 60 * 1000

// Scoped to the caller's own customerId so one customer can't delete another's log by guessing an id.
// Only the most recent entry is deletable, and only within 24h of logging it — keeps the history a
// reliable record rather than something customers can quietly rewrite after the fact.
healthLogsRouter.delete("/:id", async (req, res) => {
  const log = await prisma.healthLog.findFirst({ where: { id: req.params.id as string, customerId: req.customerId } })
  if (!log) return res.status(404).json({ error: "Health log not found" })

  const latest = await prisma.healthLog.findFirst({
    where: { customerId: req.customerId },
    orderBy: { loggedAt: "desc" },
  })
  if (latest?.id !== log.id) {
    return res.status(403).json({ error: "Only your most recently logged entry can be deleted" })
  }
  if (Date.now() - log.loggedAt.getTime() > DELETE_WINDOW_MS) {
    return res.status(403).json({ error: "Entries can only be deleted within 24 hours of logging" })
  }

  await prisma.healthLog.delete({ where: { id: log.id } })
  res.status(204).send()
})
