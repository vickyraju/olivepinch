import type { NextFunction, Request, Response } from "express"
import { verifyToken } from "../lib/auth.js"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      customerId?: string
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" })
  }
  try {
    const payload = verifyToken(header.slice("Bearer ".length))
    req.customerId = payload.sub
    next()
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" })
  }
}
