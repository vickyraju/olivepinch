import type { NextFunction, Request, Response } from "express"
import { firebaseAuth } from "../lib/firebase.js"
import { prisma } from "../lib/prisma.js"

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
