import type { NextFunction, Request, Response } from "express"
import { supabase } from "../lib/supabase.js"
import { prisma } from "../lib/prisma.js"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      customerId?: string
    }
  }
}

// Verifies a bearer token against Supabase's auth server (not just a local signature check,
// so a server-side revoke/logout takes effect immediately) and returns the Supabase user.
// Used directly by the account-linking endpoint, which runs before any Customer row is
// linked yet — everywhere else, use requireAuth below instead.
export async function verifySupabaseUser(authHeader: string | undefined) {
  if (!supabase) throw Object.assign(new Error("Auth is not configured"), { status: 501 })
  if (!authHeader?.startsWith("Bearer ")) {
    throw Object.assign(new Error("Missing bearer token"), { status: 401 })
  }
  const { data, error } = await supabase.auth.getUser(authHeader.slice("Bearer ".length))
  if (error || !data.user?.email) {
    throw Object.assign(new Error("Invalid or expired token"), { status: 401 })
  }
  return { id: data.user.id, email: data.user.email }
}

// Resolves the verified Supabase user to our own Customer.id, so every existing route keeps
// using req.customerId exactly as before — only this middleware and link-account need to
// know Supabase user ids exist at all.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const supaUser = await verifySupabaseUser(req.headers.authorization)
    const customer = await prisma.customer.findUnique({ where: { supabaseUserId: supaUser.id } })
    if (!customer) return res.status(401).json({ error: "No account linked to this session" })
    req.customerId = customer.id
    next()
  } catch (err) {
    const status = typeof (err as { status?: unknown })?.status === "number" ? (err as { status: number }).status : 401
    res.status(status).json({ error: err instanceof Error ? err.message : "Invalid or expired token" })
  }
}
