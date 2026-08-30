import type { NextFunction, Request, Response } from "express"

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err)
  const status = typeof (err as { status?: unknown })?.status === "number" ? (err as { status: number }).status : 500
  // Below 500, the message was deliberately thrown for the caller (validation errors,
  // "not found", etc. via Object.assign(new Error(...), {status})) — safe to pass through.
  // At 500, it's an unexpected failure (Prisma error, upstream API response body, etc.)
  // that can contain internal detail never meant for a client; only the log above sees it.
  const message = status < 500 && err instanceof Error ? err.message : "Internal server error"
  res.status(status).json({ error: message })
}
