import type { NextFunction, Request, Response } from "express"
import { verifyAdminToken } from "../lib/auth.js"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminId?: string
    }
  }
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" })
  }
  try {
    const payload = verifyAdminToken(header.slice("Bearer ".length))
    req.adminId = payload.sub
    next()
  } catch {
    return res.status(401).json({ error: "Invalid or expired admin token" })
  }
}
