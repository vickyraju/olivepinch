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

// Used only when CORS_ORIGIN isn't set — a safe floor (the two real frontends) rather than
// the wildcard this used to fall back to, which would accept requests from any origin.
const DEFAULT_PRODUCTION_ORIGINS = ["https://olivepinch.vercel.app", "https://olivepinch-admin.vercel.app"]

export function createApp() {
  const app = express()

  // Render sits in front of this app as a reverse proxy — without this, req.ip (and
  // therefore express-rate-limit's per-IP buckets below) sees Render's proxy address for
  // every request instead of the real client, making rate limiting apply to all traffic
  // as if from one source. `1` trusts exactly one hop, matching Render's setup.
  app.set("trust proxy", 1)

  const corsOrigin = process.env.CORS_ORIGIN
  const allowedOrigins = corsOrigin
    ? corsOrigin.split(",").map((o) => o.trim())
    : process.env.NODE_ENV === "production"
      ? DEFAULT_PRODUCTION_ORIGINS
      : ["*"]
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
