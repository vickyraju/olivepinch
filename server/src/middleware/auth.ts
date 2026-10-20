import type { NextFunction, Request, Response } from "express"
import { fromNodeHeaders } from "better-auth/node"
import { auth } from "../lib/better-auth.js"
import { prisma } from "../lib/prisma.js"
import { verifySignupToken } from "../lib/auth.js"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      customerId?: string
    }
  }
}

// Reads the login session from the cookie (looked up in the database, so a logout or revoke takes effect
// immediately) and returns the Better Auth user. Used directly by the account-linking endpoint, which runs
// before any Customer row is linked yet — everywhere else, use requireAuth below instead.
export async function verifyAuthUser(headers: Request["headers"]) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(headers) })
  if (!session?.user?.email) throw Object.assign(new Error("Not signed in"), { status: 401 })
  // Both sign-in routes (email code, Google) verify the address; refuse anything that didn't.
  if (!session.user.emailVerified) throw Object.assign(new Error("Email address is not verified"), { status: 401 })
  return { id: session.user.id, email: session.user.email }
}

// Resolves the signed-in user to our own Customer.id, so every existing route keeps
// using req.customerId exactly as before — only this middleware and link-account need to
// know login user ids exist at all.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await verifyAuthUser(req.headers)
    const customer = await prisma.customer.findUnique({ where: { authUserId: user.id } })
    if (!customer) return res.status(401).json({ error: "No account linked to this session" })
    req.customerId = customer.id
    next()
  } catch (err) {
    const status = typeof (err as { status?: unknown })?.status === "number" ? (err as { status: number }).status : 401
    res.status(status).json({ error: err instanceof Error ? err.message : "Invalid or expired token" })
  }
}

// Gates a pre-authentication signup-funnel route (no login session exists yet) to the
// one customerId the caller was actually issued a token for — without this, the route
// would accept any customerId a caller cares to supply. getTargetCustomerId reads whichever
// field (a URL param, a body field) that specific route uses to name the customer it's
// acting on; call this after validateBody if the target id comes from the body.
export function requireSignupToken(getTargetCustomerId: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization
    if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing signup token" })
    try {
      const tokenCustomerId = verifySignupToken(header.slice("Bearer ".length))
      if (tokenCustomerId !== getTargetCustomerId(req)) {
        return res.status(403).json({ error: "This signup token doesn't match that customer" })
      }
      next()
    } catch {
      res.status(401).json({ error: "Invalid or expired signup token" })
    }
  }
}
