import { contactRouter } from "./routes/contact.js"
import express from "express"
import cors from "cors"
import { toNodeHandler } from "better-auth/node"
import { auth } from "./lib/better-auth.js"
import { UPLOAD_DIR } from "./lib/menu-photos.js"
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
const DEFAULT_PRODUCTION_ORIGINS = ["https://www.olivepinch.com", "https://admin.olivepinch.com"]


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
  // credentials: the customer login session is a cookie, which browsers only send cross-origin when this is on
  // (and then the origin must be named, so a "*" setting reflects the caller's origin instead; dev only).
  const reflectAll = allowedOrigins.includes("*")
  // Reflecting any origin while cookies are allowed would let any website act as a signed-in customer.
  if (reflectAll && process.env.NODE_ENV === "production") throw new Error('CORS_ORIGIN must list the real site addresses in production, not "*"')
  app.use(cors({ origin: reflectAll ? true : allowedOrigins, credentials: true }))

  // Login (Better Auth). Must come before the JSON body parser, which would consume the request body first.
  app.use("/api/auth", rateLimit({ windowMs: 60 * 1000, max: 60 }))
  app.all("/api/auth/*splat", toNodeHandler(auth))

  // Webhook signature verification needs raw body — keep this ahead of the global
  // JSON parser regardless of provider (currently a stub; see routes/payments.ts).
  app.use("/api/payments/webhook", express.raw({ type: "application/json" }))
  // Menu photos arrive as base64 data URLs; phone photos can be 10MB+ before encoding.
  app.use(express.json({ limit: "30mb" }))

  app.use("/api", rateLimit({ windowMs: 60 * 1000, max: 120 }))
  app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "365d", immutable: true, index: false }))

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
  app.use("/api/contact", contactRouter)
  app.use("/api/admin", adminRouter)
  app.use("/api/internal", internalRouter)

  app.use(errorHandler)

  return app
}
