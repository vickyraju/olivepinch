import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-secret-change-in-production"

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(customerId: string): string {
  return jwt.sign({ sub: customerId }, JWT_SECRET, { expiresIn: "30d" })
}

export function verifyToken(token: string): { sub: string } {
  return jwt.verify(token, JWT_SECRET) as { sub: string }
}

export function signAdminToken(adminId: string): string {
  return jwt.sign({ sub: adminId, role: "admin" }, JWT_SECRET, { expiresIn: "12h" })
}

export function verifyAdminToken(token: string): { sub: string; role: string } {
  const payload = jwt.verify(token, JWT_SECRET) as { sub: string; role?: string }
  if (payload.role !== "admin") throw new Error("Not an admin token")
  return payload as { sub: string; role: string }
}

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function hashOtp(code: string): Promise<string> {
  return bcrypt.hash(code, 10)
}

export function verifyOtp(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash)
}
