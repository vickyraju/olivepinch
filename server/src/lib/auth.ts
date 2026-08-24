import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-secret-change-in-production"

// Admin auth only — customer auth is handled by Firebase (see middleware/auth.ts).
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signAdminToken(adminId: string): string {
  return jwt.sign({ sub: adminId, role: "admin" }, JWT_SECRET, { expiresIn: "12h" })
}

export function verifyAdminToken(token: string): { sub: string; role: string } {
  const payload = jwt.verify(token, JWT_SECRET) as { sub: string; role?: string }
  if (payload.role !== "admin") throw new Error("Not an admin token")
  return payload as { sub: string; role: string }
}
