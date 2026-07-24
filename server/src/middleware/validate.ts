import type { NextFunction, Request, Response } from "express"
import type { ZodType } from "zod"

export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: "Validation failed", details: result.error.issues })
    }
    req.body = result.data
    next()
  }
}
