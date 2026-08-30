import express from "express"
import cors from "cors"
import rateLimit from "express-rate-limit"
import { postcodeRouter } from "./routes/postcode.js"
import { customersRouter } from "./routes/customers.js"
import { healthLogsRouter } from "./routes/health-logs.js"
import { subscriptionsRouter } from "./routes/subscriptions.js"
import { paymentsRouter } from "./routes/payments.js"
import { menuItemsRouter } from "./routes/menu-items.js"
import { menuWeeksRouter } from "./routes/menu-weeks.js"
import { pricingRouter } from "./routes/pricing.js"
import { plansRouter } from "./routes/plans.js"
import { promoCodesRouter } from "./routes/promo-codes.js"
import { deliveryTimeSlotsRouter } from "./routes/delivery-time-slots.js"
import { allergensRouter } from "./routes/allergens.js"
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
  // Default 100kb is too small for a menu-item photo submitted as a base64 data URL.
  app.use(express.json({ limit: "8mb" }))

  app.use("/api", rateLimit({ windowMs: 60 * 1000, max: 120 }))

  app.get("/api/health", (_req, res) => res.json({ ok: true }))

  app.use("/api/postcode", postcodeRouter)
  app.use("/api/customers", customersRouter)
  app.use("/api/health-logs", healthLogsRouter)
  app.use("/api/subscriptions", subscriptionsRouter)
  app.use("/api/payments", paymentsRouter)
  app.use("/api/menu-items", menuItemsRouter)
  app.use("/api/menu-weeks", menuWeeksRouter)
  app.use("/api/pricing", pricingRouter)
  app.use("/api/plans", plansRouter)
  app.use("/api/promo-codes", promoCodesRouter)
  app.use("/api/delivery-time-slots", deliveryTimeSlotsRouter)
  app.use("/api/allergens", allergensRouter)
  app.use("/api/admin", adminRouter)
  app.use("/api/internal", internalRouter)

  app.use(errorHandler)

  return app
}
