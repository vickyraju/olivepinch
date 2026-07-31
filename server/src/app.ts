import express from "express"
import cors from "cors"
import rateLimit from "express-rate-limit"
import { postcodeRouter } from "./routes/postcode.js"
import { customersRouter } from "./routes/customers.js"
import { authRouter } from "./routes/auth.js"
import { healthLogsRouter } from "./routes/health-logs.js"
import { subscriptionsRouter } from "./routes/subscriptions.js"
import { paymentsRouter } from "./routes/payments.js"
import { menuItemsRouter } from "./routes/menu-items.js"
import { pricingRouter } from "./routes/pricing.js"
import { adminRouter } from "./routes/admin/index.js"
import { internalRouter } from "./routes/internal.js"
import { errorHandler } from "./middleware/error.js"

export function createApp() {
  const app = express()

  const allowedOrigins = (process.env.CORS_ORIGIN ?? "*").split(",").map((o) => o.trim())
  app.use(cors({ origin: allowedOrigins.includes("*") ? "*" : allowedOrigins }))

  // Webhook signature verification needs raw body — keep this ahead of the global
  // JSON parser regardless of provider (currently a stub; see routes/payments.ts).
  app.use("/api/payments/webhook", express.raw({ type: "application/json" }))
  app.use(express.json())

  // Generic ceiling on top of the tighter OTP-specific limiter in routes/auth.ts
  app.use("/api", rateLimit({ windowMs: 60 * 1000, max: 120 }))

  app.get("/api/health", (_req, res) => res.json({ ok: true }))

  app.use("/api/postcode", postcodeRouter)
  app.use("/api/customers", customersRouter)
  app.use("/api/auth", authRouter)
  app.use("/api/health-logs", healthLogsRouter)
  app.use("/api/subscriptions", subscriptionsRouter)
  app.use("/api/payments", paymentsRouter)
  app.use("/api/menu-items", menuItemsRouter)
  app.use("/api/pricing", pricingRouter)
  app.use("/api/admin", adminRouter)
  app.use("/api/internal", internalRouter)

  app.use(errorHandler)

  return app
}
