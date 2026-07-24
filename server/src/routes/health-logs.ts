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
