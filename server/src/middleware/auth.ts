import type { NextFunction, Request, Response } from "express"
import { firebaseAuth } from "../lib/firebase.js"
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

// Verifies a bearer token against Firebase (not just a local signature check, so a
// server-side revoke takes effect immediately) and returns the decoded phone number.
// Used directly by the account-linking endpoint, which runs before any Customer row is
// linked yet — everywhere else, use requireAuth below instead.
export async function verifyFirebaseUser(authHeader: string | undefined) {
  if (!firebaseAuth) throw Object.assign(new Error("Auth is not configured"), { status: 501 })
  if (!authHeader?.startsWith("Bearer ")) {
    throw Object.assign(new Error("Missing bearer token"), { status: 401 })
  }
  try {
    const decoded = await firebaseAuth.verifyIdToken(authHeader.slice("Bearer ".length))
    if (!decoded.phone_number) throw new Error("Invalid or expired token")
    return { uid: decoded.uid, phone: decoded.phone_number }
  } catch {
    throw Object.assign(new Error("Invalid or expired token"), { status: 401 })
  }
}

// Resolves the verified Firebase user to our own Customer.id, so every existing route keeps
// using req.customerId exactly as before — only this middleware and link-account need to
// know Firebase uids exist at all.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const firebaseUser = await verifyFirebaseUser(req.headers.authorization)
    const customer = await prisma.customer.findUnique({ where: { firebaseUid: firebaseUser.uid } })
    if (!customer) return res.status(401).json({ error: "No account linked to this session" })
    req.customerId = customer.id
    next()
  } catch (err) {
    const status = typeof (err as { status?: unknown })?.status === "number" ? (err as { status: number }).status : 401
    res.status(status).json({ error: err instanceof Error ? err.message : "Invalid or expired token" })
  }
}

// Gates a pre-authentication signup-funnel route (no Firebase session exists yet) to the
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
