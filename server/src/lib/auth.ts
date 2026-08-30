import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

// A hardcoded fallback secret would mean anyone reading this source could forge a valid
// admin token if JWT_SECRET is ever unset in production — fail at boot instead of silently
// running with a known, public signing key. The dev-only value only applies outside
// production, where it's fine for the whole team to share.
const rawSecret = process.env.JWT_SECRET ?? (process.env.NODE_ENV === "production" ? undefined : "dev-only-secret")
if (!rawSecret) throw new Error("JWT_SECRET must be set in production")
const JWT_SECRET: string = rawSecret

// Admin auth only — customer auth is handled by Firebase (see middleware/auth.ts).
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signAdminToken(adminId: string): string {
  return jwt.sign({ sub: adminId, role: "admin" }, JWT_SECRET, { expiresIn: "12h", algorithm: "HS256" })
}

export function verifyAdminToken(token: string): { sub: string; role: string } {
  const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as { sub: string; role?: string }
  if (payload.role !== "admin") throw new Error("Not an admin token")
  return payload as { sub: string; role: string }
}

// Binds the rest of the pre-authentication signup funnel to one specific customerId, so
// POST /subscriptions and PATCH /customers/:id/preferences can't be called against a
// customer other than the one this token was issued for. Issued once, by
// POST /customers/provisional, before any Firebase session exists — 2h is generous for a
// single checkout session without leaving a long-lived credential lying around.
export function signSignupToken(customerId: string): string {
  return jwt.sign({ sub: customerId, purpose: "signup" }, JWT_SECRET, { expiresIn: "2h", algorithm: "HS256" })
}

export function verifySignupToken(token: string): string {
  const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as { sub: string; purpose?: string }
  if (payload.purpose !== "signup") throw new Error("Not a signup token")
  return payload.sub
}
