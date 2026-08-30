import rateLimit from "express-rate-limit"

// The global limiter in app.ts (120/min) covers baseline abuse across the whole API, but two
// routes need a tighter, purpose-specific limit: brute-forcing an admin password, and mapping
// which phone numbers have an OlivePinch account (see SECURITY_AUDIT.md OP-11/OP-12).

export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
})

export const checkPhoneLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again shortly." },
})
