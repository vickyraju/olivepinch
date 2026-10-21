// Creates (or resets the password of) an admin login. Usage (from server/):
//   ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" ADMIN_PASSWORD='long password' npx tsx scripts/create-admin.mts
import bcrypt from "bcryptjs"
import { prisma } from "../src/lib/prisma.js"

const { ADMIN_EMAIL: email, ADMIN_NAME: name, ADMIN_PASSWORD: password } = process.env
if (!email || !name || !password) throw new Error("Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD")
if (password.length < 12) throw new Error("Use a password of at least 12 characters")
const passwordHash = await bcrypt.hash(password, 12)
await prisma.adminUser.upsert({ where: { email: email.toLowerCase() }, update: { passwordHash, name }, create: { email: email.toLowerCase(), name, passwordHash } })
console.log("Admin ready:", email.toLowerCase())
await prisma.$disconnect()
