import rateLimit from "express-rate-limit"

// The global limiter in app.ts (120/min) covers baseline abuse across the whole API, but two
// routes need a tighter, purpose-specific limit: brute-forcing an admin password, and mapping
// which emails have an OlivePinch account (see SECURITY_AUDIT.md OP-11/OP-12).

export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
})

export const checkEmailLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again shortly." },
})

// The contact form is public and sends a real email each time, so it gets a tight per-IP cap.
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages sent. Please try again later, or email hello@olivepinch.com." },
})
